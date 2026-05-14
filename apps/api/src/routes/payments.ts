import { Hono } from 'hono';
import type { Bindings, Variables } from '../types/bindings';
import { requireSession } from '../middleware/auth';
import {
  withDb,
  createPayment,
  createReport,
  getPaymentByProviderRef,
  getTestResult,
  markPaymentCompleted,
} from '../lib/db';
import { generateCompatibilityReport } from '../lib/report';
import {
  createCheckoutSession,
  verifyPayOSSignature,
  verifyStripeSignature,
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

  const id = crypto.randomUUID();
  await createPayment(db, {
    id,
    userId,
    resultId,
    productType,
    gateway: session.gateway,
    providerRef: session.providerRef,
    amount: session.amount,
    currency: session.currency,
  });

  return c.json({ data: { checkoutUrl: session.checkoutUrl }, error: null }, 201);
});

// Webhook handler — public (signature validated). Body MUST be read as raw text
// for HMAC verification; do not parse before validation.
payments.post('/webhook', async (c) => {
  const bodyText = await c.req.text();
  const stripeSig = c.req.header('Stripe-Signature');
  const payosSig =
    c.req.header('x-payos-signature') ?? c.req.header('X-Payos-Signature');

  const db = withDb(c);

  if (stripeSig) {
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
  }

  if (payosSig) {
    const { valid, payload } = await verifyPayOSSignature(
      c.env.PAYOS_CHECKSUM_KEY,
      bodyText,
      payosSig,
    );
    if (!valid) {
      return c.json(
        {
          data: null,
          error: {
            code: 'INVALID_WEBHOOK_SIGNATURE',
            message: 'PayOS signature verification failed',
          },
        },
        400,
      );
    }
    const orderCode = (payload as { data?: { orderCode?: string | number } }).data?.orderCode;
    if (orderCode != null) {
      const providerRef = String(orderCode);
      const existing = await getPaymentByProviderRef(db, providerRef);
      if (existing && existing.status !== 'completed') {
        await markPaymentCompleted(db, providerRef);
        if (existing.product_type === 'couple_pack') {
          c.executionCtx.waitUntil(maybeGenerateCouplePackReport(c, existing));
        }
      }
    }
    return c.json({ data: { received: true }, error: null });
  }

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
    // The inviter's result_id is the user's own result. Find an invite link
    // for it and a corresponding invitee test_result linked via invite_source_token.
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
