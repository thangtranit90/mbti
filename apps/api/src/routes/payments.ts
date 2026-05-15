import { Hono } from 'hono';
import type { Bindings, Variables } from '../types/bindings';
import { requireSession } from '../middleware/auth';
import {
  withDb,
  createPayment,
  createReport,
  getPaymentByProviderRef,
  getPaymentById,
  getTestResult,
  markPaymentCompleted,
} from '../lib/db';
import { generateCompatibilityReport } from '../lib/report';
import {
  createCheckoutSession,
  verifyStripeSignature,
  verifySePayApiKey,
  extractProviderRef,
} from '../lib/payment';
import { CheckoutRequestSchema } from '@mbti/shared';

const payments = new Hono<{ Bindings: Bindings; Variables: Variables }>();

payments.post('/checkout', requireSession, async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      400,
    );
  }

  const { productType, resultId, gateway } = CheckoutRequestSchema.parse(payload);
  const userId = c.get('userId');
  const db = withDb(c);

  let session;
  try {
    session = await createCheckoutSession(c.env, {
      productType,
      resultId,
      userId,
      gateway,
    });
  } catch (err) {
    console.error('checkout session create failed:', err);
    return c.json(
      {
        data: null,
        error: { code: 'GATEWAY_ERROR', message: 'Unable to create checkout session' },
      },
      502,
    );
  }

  const paymentId = crypto.randomUUID();
  await createPayment(db, {
    id: paymentId,
    userId,
    resultId,
    productType,
    gateway: session.gateway,
    providerRef: session.providerRef,
    amount: session.amount,
    currency: session.currency,
  });

  if (session.gateway === 'sepay') {
    return c.json(
      {
        data: {
          gateway: 'sepay',
          paymentId,
          qrUrl: session.qrUrl,
          transferContent: session.transferContent,
          amount: session.amount,
          bankAccount: session.bankAccount,
          bankName: session.bankName,
        },
        error: null,
      },
      201,
    );
  }

  return c.json(
    {
      data: { gateway: 'stripe', paymentId, checkoutUrl: session.checkoutUrl },
      error: null,
    },
    201,
  );
});

// SePay IPN — public; auth via `Authorization: Apikey <SEPAY_IPN_API_KEY>`.
// MUST return HTTP 200/201 with body {"success": true} within 30s or SePay
// retries. This response shape intentionally bypasses the {data,error} envelope.
payments.post('/sepay-ipn', async (c) => {
  const auth = c.req.header('Authorization') ?? c.req.header('authorization');
  if (!verifySePayApiKey(c.env, auth)) {
    return c.json({ success: false, message: 'Unauthorized' }, 401);
  }

  let body: {
    id?: string | number;
    transferType?: string;
    transferAmount?: number;
    code?: string | null;
    content?: string | null;
    description?: string | null;
  };
  try {
    body = await c.req.json();
  } catch {
    // Malformed body but authenticated — ack so SePay stops retrying a payload
    // we can never process.
    return c.json({ success: true }, 200);
  }

  // Only incoming transfers are payments. Ack-and-ignore outgoing.
  if (body.transferType !== 'in') {
    return c.json({ success: true }, 200);
  }

  const db = withDb(c);
  // Resolve our transfer content (provider_ref): prefer SePay's auto-extracted
  // `code`, else scan content/description for the QM-prefixed token we embed.
  const providerRef = extractProviderRef(body);
  if (!providerRef) {
    // Authenticated but unmatched (e.g. unrelated transfer) — ack so SePay
    // doesn't retry forever; nothing to do.
    return c.json({ success: true }, 200);
  }

  const existing = await getPaymentByProviderRef(db, providerRef);
  if (existing && existing.status !== 'completed') {
    await markPaymentCompleted(db, providerRef);
    if (existing.product_type === 'couple_pack') {
      c.executionCtx.waitUntil(maybeGenerateCouplePackReport(c, existing));
    }
  }
  return c.json({ success: true }, 200);
});

// Stripe webhook — HMAC-signed.
payments.post('/webhook', async (c) => {
  const bodyText = await c.req.text();
  const stripeSig = c.req.header('Stripe-Signature');

  if (!stripeSig) {
    return c.json(
      {
        data: null,
        error: {
          code: 'INVALID_WEBHOOK_SIGNATURE',
          message: 'Missing webhook signature header',
        },
      },
      400,
    );
  }

  const db = withDb(c);
  const { valid, eventId } = await verifyStripeSignature(
    c.env.STRIPE_WEBHOOK_SECRET,
    bodyText,
    stripeSig,
  );
  if (!valid) {
    return c.json(
      {
        data: null,
        error: {
          code: 'INVALID_WEBHOOK_SIGNATURE',
          message: 'Stripe signature verification failed',
        },
      },
      400,
    );
  }
  let parsed: {
    id?: string;
    type?: string;
    data?: { object?: { id?: string; client_reference_id?: string } };
  };
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return c.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Invalid webhook body' } },
      400,
    );
  }
  if (parsed.type === 'checkout.session.completed') {
    const sessionId = parsed.data?.object?.id;
    if (sessionId) {
      const payment = await getPaymentByProviderRef(db, sessionId);
      await markPaymentCompleted(db, sessionId);
      if (payment && payment.product_type === 'couple_pack') {
        c.executionCtx.waitUntil(maybeGenerateCouplePackReport(c, payment));
      }
    }
  }
  return c.json({ data: { received: true, eventId }, error: null });
});

// Polled by the SePay QR screen until the transfer is reconciled.
payments.get('/:paymentId/status', requireSession, async (c) => {
  const userId = c.get('userId');
  const db = withDb(c);
  const row = await getPaymentById(db, c.req.param('paymentId'));
  if (!row) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Payment not found' } },
      404,
    );
  }
  if (row.user_id !== userId.toLowerCase()) {
    return c.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Not your payment' } },
      403,
    );
  }
  return c.json({ data: { status: row.status }, error: null });
});

// Async: generate compatibility report once Couple Pack payment is confirmed.
// Best-effort — never crashes the webhook response.
async function maybeGenerateCouplePackReport(
  c: { env: Bindings },
  payment: { id: string; user_id: string; result_id: string | null },
): Promise<void> {
  try {
    const db = c.env.DB;
    if (!payment.result_id) return;
    const invitee = await db
      .prepare(
        `SELECT tr.id as id, tr.user_id as user_id, tr.calculated_type as calculated_type, tr.persona_name as persona_name
         FROM invite_links il
         INNER JOIN test_results tr ON tr.invite_source_token = il.token
         WHERE il.inviter_result_id = ? AND tr.deleted_at IS NULL
         ORDER BY tr.created_at DESC LIMIT 1`,
      )
      .bind(payment.result_id.toLowerCase())
      .all<{ id: string; user_id: string; calculated_type: string; persona_name: string }>();
    const inviteeRow = invitee.success ? invitee.results[0] : undefined;
    if (!inviteeRow) return;

    const inviter = await getTestResult(db, payment.result_id);
    if (!inviter) return;
    const reportData = generateCompatibilityReport({
      inviter: {
        mbtiType: inviter.calculated_type,
        personaName: inviter.persona_name,
      },
      invitee: {
        mbtiType: inviteeRow.calculated_type as never,
        personaName: inviteeRow.persona_name,
      },
    });
    const reportId = crypto.randomUUID();
    const r2Key = `reports/${reportId}.json`;
    await c.env.ASSETS_BUCKET.put(r2Key, JSON.stringify(reportData), {
      httpMetadata: { contentType: 'application/json' },
    });
    await createReport(db, {
      id: reportId,
      inviterUserId: payment.user_id,
      inviteeUserId: inviteeRow.user_id,
      inviterResultId: payment.result_id,
      inviteeResultId: inviteeRow.id,
      r2Key,
    });
  } catch (err) {
    console.error('couple_pack report generation failed:', err);
  }
}

export default payments;
