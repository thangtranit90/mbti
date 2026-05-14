// Story 5.1 — Payment gateway abstraction. Two adapters: PayOS (primary for VN)
// and Stripe (international). All gateway calls go through this module so the
// route handler is gateway-agnostic.
//
// PCI: the Worker NEVER touches card data. Both gateways host their own
// checkout pages and return a redirect URL.

import type { Bindings } from '../types/bindings';
import { PRODUCT_CATALOG, type ProductType } from '@mbti/shared';

export type Gateway = 'payos' | 'stripe';

export type CheckoutParams = {
  productType: ProductType;
  resultId: string;
  userId: string;
  gateway?: Gateway;
};

export type CheckoutSession = {
  gateway: Gateway;
  checkoutUrl: string;
  providerRef: string;
  amount: number;
  currency: string;
};

function pickGateway(env: Bindings, requested?: Gateway): Gateway {
  if (requested) return requested;
  if (env.PAYOS_API_KEY && env.PAYOS_CLIENT_ID && env.PAYOS_CHECKSUM_KEY) {
    return 'payos';
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

// ---------------------- PayOS ----------------------
// Minimal PayOS Create-Payment integration. Real PayOS API:
//   POST https://api-merchant.payos.vn/v2/payment-requests
//   Headers: x-client-id, x-api-key
//   Body: { orderCode, amount, description, returnUrl, cancelUrl, signature }

async function createPayOSSession(
  env: Bindings,
  params: CheckoutParams,
): Promise<CheckoutSession> {
  const product = PRODUCT_CATALOG[params.productType];
  // orderCode must be a positive integer that fits in 53-bit JS number; derive
  // from current time + small random suffix to avoid collisions inside a sec.
  const orderCode = Number(`${Date.now()}${Math.floor(Math.random() * 100)}`);
  const description = product.label;
  const returnUrl = `${originForReturn(env)}/payment/success`;
  const cancelUrl = `${originForReturn(env)}/payment/cancel`;

  // Signature is HMAC-SHA256 over key=value pairs in alphabetical order,
  // joined by '&'. Spec: `amount=...&cancelUrl=...&description=...&orderCode=...&returnUrl=...`.
  const signaturePayload = [
    `amount=${product.amount}`,
    `cancelUrl=${cancelUrl}`,
    `description=${description}`,
    `orderCode=${orderCode}`,
    `returnUrl=${returnUrl}`,
  ].join('&');
  const signature = await hmacSha256Hex(env.PAYOS_CHECKSUM_KEY, signaturePayload);

  const res = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': env.PAYOS_CLIENT_ID,
      'x-api-key': env.PAYOS_API_KEY,
    },
    body: JSON.stringify({
      orderCode,
      amount: product.amount,
      description,
      returnUrl,
      cancelUrl,
      signature,
    }),
  });

  if (!res.ok) {
    throw new Error(`PayOS create payment failed: ${res.status}`);
  }
  const body = (await res.json()) as {
    code?: string;
    data?: { checkoutUrl?: string; paymentLinkId?: string };
  };
  if (!body.data?.checkoutUrl) {
    throw new Error(`PayOS missing checkoutUrl (code=${body.code ?? 'unknown'})`);
  }

  return {
    gateway: 'payos',
    checkoutUrl: body.data.checkoutUrl,
    providerRef: String(orderCode),
    amount: product.amount,
    currency: product.currency,
  };
}

export async function verifyPayOSSignature(
  checksumKey: string,
  bodyText: string,
  receivedSignature: string,
): Promise<{ valid: boolean; payload: unknown }> {
  // PayOS webhook signs the `data` object's flattened key=value pairs.
  let parsed: { data?: Record<string, unknown> } = {};
  try {
    parsed = JSON.parse(bodyText) as { data?: Record<string, unknown> };
  } catch {
    return { valid: false, payload: null };
  }
  if (!parsed.data) return { valid: false, payload: null };
  const sortedKeys = Object.keys(parsed.data).sort();
  const signaturePayload = sortedKeys
    .map((k) => `${k}=${String((parsed.data as Record<string, unknown>)[k] ?? '')}`)
    .join('&');
  const expected = await hmacSha256Hex(checksumKey, signaturePayload);
  return { valid: expected === receivedSignature, payload: parsed };
}

// ---------------------- Stripe ----------------------
async function createStripeSession(
  env: Bindings,
  params: CheckoutParams,
): Promise<CheckoutSession> {
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
  if (gateway === 'payos') {
    return createPayOSSession(env, params);
  }
  return createStripeSession(env, params);
}
