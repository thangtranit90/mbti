import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockCreateCheckout, mockVerifyStripe, mockVerifySePay, mockExtractRef } =
  vi.hoisted(() => ({
    mockCreateCheckout: vi.fn(),
    mockVerifyStripe: vi.fn(),
    mockVerifySePay: vi.fn(),
    mockExtractRef: vi.fn(),
  }));
vi.mock('../../src/lib/payment', () => ({
  createCheckoutSession: mockCreateCheckout,
  verifyStripeSignature: mockVerifyStripe,
  verifySePayApiKey: mockVerifySePay,
  extractProviderRef: mockExtractRef,
}));

import { app } from '../../src/index';
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
    SEPAY_IPN_API_KEY: 'ipnkey',
    SEPAY_BANK_ACCOUNT: '0123456789',
    SEPAY_BANK_CODE: '970436',
    SEPAY_BANK_NAME: 'Vietcombank',
    STRIPE_SECRET_KEY: 'sk',
    STRIPE_WEBHOOK_SECRET: 'wh',
  }) as any;

describe('POST /api/payments/checkout (SePay)', () => {
  let kv: ReturnType<typeof makeKv>;
  let dbMock: ReturnType<typeof makeDb>;

  beforeEach(() => {
    kv = makeKv({ userId: USER_ID, createdAt: '2026-05-05T00:00:00.000Z' });
    dbMock = makeDb();
    mockCreateCheckout.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('(a) sepay → returns QR data + inserts pending payment', async () => {
    mockCreateCheckout.mockResolvedValue({
      gateway: 'sepay',
      qrUrl: 'https://qr.sepay.vn/img?acc=0123456789&bank=970436&amount=49000&des=QMABC123',
      transferContent: 'QMABC123',
      providerRef: 'QMABC123',
      amount: 49000,
      currency: 'VND',
      bankAccount: '0123456789',
      bankName: 'Vietcombank',
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
    const body = (await res.json()) as {
      data: { gateway: string; paymentId: string; qrUrl: string; transferContent: string } | null;
    };
    expect(res.status).toBe(201);
    expect(body.data?.gateway).toBe('sepay');
    expect(body.data?.transferContent).toBe('QMABC123');
    expect(body.data?.qrUrl).toContain('qr.sepay.vn');
    expect(createSpy).toHaveBeenCalledOnce();
    expect(createSpy.mock.calls[0]?.[1].gateway).toBe('sepay');
  });

  it('(b) stripe → returns checkoutUrl', async () => {
    mockCreateCheckout.mockResolvedValue({
      gateway: 'stripe',
      checkoutUrl: 'https://checkout.stripe.com/c/xyz',
      providerRef: 'cs_test_1',
      amount: 49000,
      currency: 'VND',
    });
    vi.spyOn(db, 'createPayment').mockResolvedValue();

    const res = await app.request(
      '/api/payments/checkout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Token': SESSION_TOKEN },
        body: JSON.stringify({ productType: 'gap_report', resultId: RESULT_ID, gateway: 'stripe' }),
      },
      baseEnv(kv, dbMock),
    );
    const body = (await res.json()) as {
      data: { gateway: string; checkoutUrl: string } | null;
    };
    expect(res.status).toBe(201);
    expect(body.data?.gateway).toBe('stripe');
    expect(body.data?.checkoutUrl).toContain('checkout.stripe.com');
  });

  it('(c) gateway failure → 502 GATEWAY_ERROR', async () => {
    mockCreateCheckout.mockRejectedValue(new Error('down'));
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

  it('(d) missing session → 401', async () => {
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

  it('(e) invalid productType → 400 VALIDATION_ERROR', async () => {
    const res = await app.request(
      '/api/payments/checkout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Token': SESSION_TOKEN },
        body: JSON.stringify({ productType: 'sub', resultId: RESULT_ID }),
      },
      baseEnv(kv, dbMock),
    );
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/payments/:paymentId/status', () => {
  let kv: ReturnType<typeof makeKv>;
  let dbMock: ReturnType<typeof makeDb>;
  beforeEach(() => {
    kv = makeKv({ userId: USER_ID, createdAt: '2026-05-05T00:00:00.000Z' });
    dbMock = makeDb();
  });
  afterEach(() => vi.restoreAllMocks());

  const PID = '33333333-4444-4555-8666-777777777777';
  const makePayment = (over: Record<string, unknown> = {}) => ({
    id: PID,
    user_id: USER_ID,
    result_id: RESULT_ID,
    product_type: 'gap_report' as const,
    gateway: 'sepay' as const,
    provider_ref: 'QMABC123',
    amount: 49000,
    currency: 'VND',
    status: 'pending' as const,
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
    completed_at: null,
    deleted_at: null,
    ...over,
  });

  it('(f) owner → returns status', async () => {
    vi.spyOn(db, 'getPaymentById').mockResolvedValue(makePayment({ status: 'completed' }));
    const res = await app.request(
      `/api/payments/${PID}/status`,
      { method: 'GET', headers: { 'X-Session-Token': SESSION_TOKEN } },
      baseEnv(kv, dbMock),
    );
    const body = (await res.json()) as { data: { status: string } | null };
    expect(res.status).toBe(200);
    expect(body.data?.status).toBe('completed');
  });

  it('(g) other user → 403', async () => {
    vi.spyOn(db, 'getPaymentById').mockResolvedValue(
      makePayment({ user_id: 'someone-else' }),
    );
    const res = await app.request(
      `/api/payments/${PID}/status`,
      { method: 'GET', headers: { 'X-Session-Token': SESSION_TOKEN } },
      baseEnv(kv, dbMock),
    );
    expect(res.status).toBe(403);
  });

  it('(h) unknown → 404', async () => {
    vi.spyOn(db, 'getPaymentById').mockResolvedValue(null);
    const res = await app.request(
      `/api/payments/${PID}/status`,
      { method: 'GET', headers: { 'X-Session-Token': SESSION_TOKEN } },
      baseEnv(kv, dbMock),
    );
    expect(res.status).toBe(404);
  });
});
