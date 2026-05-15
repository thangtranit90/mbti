// Story 5.1 + 5.4 — Payment gateway abstraction. Two adapters:
//   - SePay (primary VN): VietQR bank-transfer reconciliation. We build a
//     VietQR image URL; the user transfers via their bank app; SePay sends an
//     IPN authenticated by `Authorization: Apikey` when the money lands.
//   - Stripe (international cards): hosted checkout + HMAC-signed webhook.
//
// PCI: the Worker NEVER touches card/bank credentials. SePay's QR encodes the
// merchant bank account; Stripe hosts its own card form.

import type { Bindings } from '../types/bindings';
import { PRODUCT_CATALOG, type ProductType } from '@mbti/shared';

export type Gateway = 'sepay' | 'stripe';

export type CheckoutParams = {
  productType: ProductType;
  resultId: string;
  userId: string;
  gateway?: Gateway;
};

export type StripeCheckoutSession = {
  gateway: 'stripe';
  checkoutUrl: string;
  providerRef: string;
  amount: number;
  currency: string;
};

export type SePayCheckoutSession = {
  gateway: 'sepay';
  qrUrl: string;
  transferContent: string;
  providerRef: string;
  amount: number;
  currency: string;
  bankAccount: string;
  bankName: string;
};

export type CheckoutSession = StripeCheckoutSession | SePayCheckoutSession;

function pickGateway(env: Bindings, requested?: Gateway): Gateway {
  if (requested) return requested;
  if (env.SEPAY_BANK_ACCOUNT && env.SEPAY_BANK_CODE && env.SEPAY_IPN_API_KEY) {
    return 'sepay';
  }
  return 'stripe';
}

function originForReturn(env: Bindings): string {
  return env.PUBLIC_WEB_ORIGIN ?? 'https://quietmirror.app';
}

async function hmacSha256Hex(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------- SePay ----------------------
// No outbound API call needed: we construct a VietQR image URL. SePay matches
// the incoming bank transfer by the `des` (transfer content) we embed here.

function generateTransferContent(): string {
  // QM + 8 base36 chars, uppercase, alphanumeric only — bank transfer content
  // fields reject most punctuation, so keep it tight (≤ ~20 chars).
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  return `QM${rand.toUpperCase()}`;
}

export function createSePayCheckout(
  env: Bindings,
  params: CheckoutParams,
): SePayCheckoutSession {
  const product = PRODUCT_CATALOG[params.productType];
  const transferContent = generateTransferContent();
  const qr = new URL('https://qr.sepay.vn/img');
  qr.searchParams.set('acc', env.SEPAY_BANK_ACCOUNT);
  qr.searchParams.set('bank', env.SEPAY_BANK_CODE);
  qr.searchParams.set('amount', String(product.amount));
  qr.searchParams.set('des', transferContent);

  return {
    gateway: 'sepay',
    qrUrl: qr.toString(),
    transferContent,
    providerRef: transferContent,
    amount: product.amount,
    currency: product.currency,
    bankAccount: env.SEPAY_BANK_ACCOUNT,
    bankName: env.SEPAY_BANK_NAME,
  };
}

// SePay IPN auth: header `Authorization: Apikey <SEPAY_IPN_API_KEY>`.
export function verifySePayApiKey(
  env: Bindings,
  authHeader: string | undefined,
): boolean {
  if (!authHeader) return false;
  const expected = `Apikey ${env.SEPAY_IPN_API_KEY}`;
  // Constant-time-ish: lengths differ → fail fast; otherwise compare.
  if (authHeader.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= authHeader.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// Extract our provider_ref (a `QM`-prefixed token) from a SePay IPN payload.
// SePay auto-extracts a `code` when the transfer content matches a known
// pattern; otherwise the raw content is in `content`/`description`.
const PROVIDER_REF_RE = /QM[A-Z0-9]{6,}/;

export function extractProviderRef(payload: {
  code?: string | null;
  content?: string | null;
  description?: string | null;
}): string | null {
  const hay = `${payload.code ?? ''} ${payload.content ?? ''} ${payload.description ?? ''}`;
  const m = hay.toUpperCase().match(PROVIDER_REF_RE);
  return m ? m[0] : null;
}

// ---------------------- Stripe ----------------------
async function createStripeSession(
  env: Bindings,
  params: CheckoutParams,
): Promise<StripeCheckoutSession> {
  const product = PRODUCT_CATALOG[params.productType];
  const successUrl = `${originForReturn(env)}/payment/success`;
  const cancelUrl = `${originForReturn(env)}/payment/cancel`;
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', successUrl);
  form.set('cancel_url', cancelUrl);
  form.set('client_reference_id', `${params.userId}:${params.productType}:${params.resultId}`);
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', product.currency.toLowerCase());
  form.set('line_items[0][price_data][unit_amount]', String(product.amount));
  form.set('line_items[0][price_data][product_data][name]', product.label);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  if (!res.ok) {
    throw new Error(`Stripe checkout session failed: ${res.status}`);
  }
  const body = (await res.json()) as { id?: string; url?: string };
  if (!body.id || !body.url) {
    throw new Error('Stripe response missing id/url');
  }

  return {
    gateway: 'stripe',
    checkoutUrl: body.url,
    providerRef: body.id,
    amount: product.amount,
    currency: product.currency,
  };
}

export async function verifyStripeSignature(
  webhookSecret: string,
  bodyText: string,
  signatureHeader: string,
): Promise<{ valid: boolean; eventId: string | null; payload: unknown }> {
  // Stripe-Signature header: t=...,v1=... — we check v1 against
  // HMAC-SHA256(secret, `${t}.${bodyText}`).
  const parts = signatureHeader.split(',').map((p) => p.trim());
  const t = parts.find((p) => p.startsWith('t='))?.slice(2);
  const v1 = parts.find((p) => p.startsWith('v1='))?.slice(3);
  if (!t || !v1) return { valid: false, eventId: null, payload: null };
  const expected = await hmacSha256Hex(webhookSecret, `${t}.${bodyText}`);
  if (expected !== v1) return { valid: false, eventId: null, payload: null };
  try {
    const parsed = JSON.parse(bodyText) as { id?: string };
    return { valid: true, eventId: parsed.id ?? null, payload: parsed };
  } catch {
    return { valid: false, eventId: null, payload: null };
  }
}

export async function createCheckoutSession(
  env: Bindings,
  params: CheckoutParams,
): Promise<CheckoutSession> {
  const gateway = pickGateway(env, params.gateway);
  if (gateway === 'sepay') {
    return createSePayCheckout(env, params);
  }
  return createStripeSession(env, params);
}
