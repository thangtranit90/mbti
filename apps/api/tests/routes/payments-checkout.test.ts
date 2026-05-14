import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockCreateCheckout, mockVerifyStripe, mockVerifyPayOS } = vi.hoisted(() => ({
  mockCreateCheckout: vi.fn(),
  mockVerifyStripe: vi.fn(),
  mockVerifyPayOS: vi.fn(),
}));
vi.mock('../../src/lib/payment', () => ({
  createCheckoutSession: mockCreateCheckout,
  verifyStripeSignature: mockVerifyStripe,
  verifyPayOSSignature: mockVerifyPayOS,
}));

import app from '../../src/index';
import * as db from '../../src/lib/db';

const SESSION_TOKEN = '22222222-3333-4444-8555-666666666666';
const USER_ID = 'ffffffff-1111-4222-8333-444444444444';
const RESULT_ID = '11111111-2222-4333-8444-555555555555';

const makeKv = (sessionData: { userId: string; createdAt: string } | null = null) => ({
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockImplementation(async (key: string, type?: string) => {
    if (key !== `session:${SESSION_TOKEN}` || !sessionData) return null;
    return type === 'json' ? sessionData : JSON.stringify(sessionData);
  }),
  delete: vi.fn().mockResolvedValue(undefined),
  list: vi.fn(),
  getWithMetadata: vi.fn(),
});

const makeDb = () => ({
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ success: true, results: [] }),
    run: vi.fn().mockResolvedValue({ success: true }),
    first: vi.fn().mockResolvedValue(null),
  }),
});

const baseEnv = (kv: ReturnType<typeof makeKv>, dbMock: ReturnType<typeof makeDb>) =>
  ({
    KV: kv,
    DB: dbMock,
    PAYOS_API_KEY: 'pk',
    PAYOS_CLIENT_ID: 'cid',
    PAYOS_CHECKSUM_KEY: 'ck',
    STRIPE_SECRET_KEY: 'sk',
    STRIPE_WEBHOOK_SECRET: 'wh',
  }) as any;

describe('POST /api/payments/checkout', () => {
  let kv: ReturnType<typeof makeKv>;
  let dbMock: ReturnType<typeof makeDb>;

  beforeEach(() => {
    kv = makeKv({ userId: USER_ID, createdAt: '2026-05-05T00:00:00.000Z' });
    dbMock = makeDb();
    mockCreateCheckout.mockReset();
    mockVerifyStripe.mockReset();
    mockVerifyPayOS.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('(a) happy path → returns checkoutUrl and inserts a pending payment row', async () => {
    mockCreateCheckout.mockResolvedValue({
      gateway: 'payos',
      checkoutUrl: 'https://payos/c/abc',
      providerRef: '123',
      amount: 49000,
      currency: 'VND',
    });
    const createSpy = vi.spyOn(db, 'createPayment').mockResolvedValue();

    const res = await app.request(
      '/api/payments/checkout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Token': SESSION_TOKEN },
        body: JSON.stringify({ productType: 'gap_report', resultId: RESULT_ID }),
      },
      baseEnv(kv, dbMock),
    );
    const body = (await res.json()) as { data: { checkoutUrl: string } | null };
    expect(res.status).toBe(201);
    expect(body.data?.checkoutUrl).toBe('https://payos/c/abc');
    expect(createSpy).toHaveBeenCalledOnce();
  });

  it('(b) gateway failure → 502 GATEWAY_ERROR', async () => {
    mockCreateCheckout.mockRejectedValue(new Error('gateway down'));
    const res = await app.request(
      '/api/payments/checkout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Token': SESSION_TOKEN },
        body: JSON.stringify({ productType: 'couple_pack', resultId: RESULT_ID }),
      },
      baseEnv(kv, dbMock),
    );
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(502);
    expect(body.error.code).toBe('GATEWAY_ERROR');
  });

  it('(c) missing session → 401', async () => {
    const res = await app.request(
      '/api/payments/checkout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType: 'gap_report', resultId: RESULT_ID }),
      },
      baseEnv(kv, dbMock),
    );
    expect(res.status).toBe(401);
  });

  it('(d) invalid productType → 400 VALIDATION_ERROR', async () => {
    const res = await app.request(
      '/api/payments/checkout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Token': SESSION_TOKEN },
        body: JSON.stringify({ productType: 'subscription', resultId: RESULT_ID }),
      },
      baseEnv(kv, dbMock),
    );
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/payments/webhook', () => {
  let kv: ReturnType<typeof makeKv>;
  let dbMock: ReturnType<typeof makeDb>;

  beforeEach(() => {
    kv = makeKv();
    dbMock = makeDb();
    mockVerifyStripe.mockReset();
    mockVerifyPayOS.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('(e) Stripe valid signature + checkout.session.completed → marks completed', async () => {
    mockVerifyStripe.mockResolvedValue({
      valid: true,
      eventId: 'evt_1',
      payload: { type: 'checkout.session.completed' },
    });
    const markSpy = vi.spyOn(db, 'markPaymentCompleted').mockResolvedValue();

    const body = JSON.stringify({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_123' } },
    });
    const res = await app.request(
      '/api/payments/webhook',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 't=1,v1=x' },
        body,
      },
      baseEnv(kv, dbMock),
    );
    expect(res.status).toBe(200);
    expect(markSpy).toHaveBeenCalledWith(expect.anything(), 'cs_test_123');
  });

  it('(f) Stripe invalid signature → 400 INVALID_WEBHOOK_SIGNATURE, no DB write', async () => {
    mockVerifyStripe.mockResolvedValue({ valid: false, eventId: null, payload: null });
    const markSpy = vi.spyOn(db, 'markPaymentCompleted').mockResolvedValue();

    const res = await app.request(
      '/api/payments/webhook',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 't=1,v1=x' },
        body: '{}',
      },
      baseEnv(kv, dbMock),
    );
    const json = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
    expect(markSpy).not.toHaveBeenCalled();
  });

  it('(g) no signature header → 400 INVALID_WEBHOOK_SIGNATURE', async () => {
    const res = await app.request(
      '/api/payments/webhook',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
      baseEnv(kv, dbMock),
    );
    expect(res.status).toBe(400);
  });

  it('(h) PayOS valid signature → marks completed by orderCode', async () => {
    mockVerifyPayOS.mockResolvedValue({
      valid: true,
      payload: { data: { orderCode: 555 } },
    });
    vi.spyOn(db, 'getPaymentByProviderRef').mockResolvedValue({
      id: 'p',
      user_id: 'u',
      result_id: null,
      product_type: 'gap_report',
      gateway: 'payos',
      provider_ref: '555',
      amount: 49000,
      currency: 'VND',
      status: 'pending',
      created_at: '2026-05-05T00:00:00.000Z',
      updated_at: '2026-05-05T00:00:00.000Z',
      completed_at: null,
      deleted_at: null,
    });
    const markSpy = vi.spyOn(db, 'markPaymentCompleted').mockResolvedValue();

    const res = await app.request(
      '/api/payments/webhook',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-payos-signature': 'sig' },
        body: JSON.stringify({ data: { orderCode: 555 } }),
      },
      baseEnv(kv, dbMock),
    );
    expect(res.status).toBe(200);
    expect(markSpy).toHaveBeenCalledWith(expect.anything(), '555');
  });
});
