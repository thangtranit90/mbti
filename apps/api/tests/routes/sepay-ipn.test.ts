import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app } from '../../src/index';
import * as db from '../../src/lib/db';
import type { PaymentRow } from '@mbti/shared';

const API_KEY = 'sepay-ipn-secret';

const makeDb = () => ({
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ success: true, results: [] }),
    run: vi.fn().mockResolvedValue({ success: true }),
    first: vi.fn().mockResolvedValue(null),
  }),
});

const env = (dbMock: ReturnType<typeof makeDb>) =>
  ({ DB: dbMock, SEPAY_IPN_API_KEY: API_KEY }) as any;

function makePayment(over: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 'pay-1',
    user_id: 'user-1',
    result_id: 'res-1',
    product_type: 'gap_report',
    gateway: 'sepay',
    provider_ref: 'QMABC123XYZ',
    amount: 49000,
    currency: 'VND',
    status: 'pending',
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
    completed_at: null,
    deleted_at: null,
    email: null,
    email_sent_at: null,
    ...over,
  };
}

const post = (
  body: unknown,
  dbMock: ReturnType<typeof makeDb>,
  headers: Record<string, string> = {},
) =>
  app.request(
    '/api/payments/sepay-ipn',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    },
    env(dbMock),
  );

describe('POST /api/payments/sepay-ipn', () => {
  let dbMock: ReturnType<typeof makeDb>;
  beforeEach(() => {
    dbMock = makeDb();
  });
  afterEach(() => vi.restoreAllMocks());

  it('(a) missing/invalid apikey → 401, no DB write', async () => {
    const markSpy = vi.spyOn(db, 'markPaymentCompleted').mockResolvedValue();
    const res = await post(
      { transferType: 'in', code: 'QMABC123XYZ', transferAmount: 49000 },
      dbMock,
      { Authorization: 'Apikey wrong' },
    );
    const body = (await res.json()) as { success: boolean };
    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(markSpy).not.toHaveBeenCalled();
  });

  it('(b) valid apikey + incoming transfer → marks completed, {"success":true}', async () => {
    vi.spyOn(db, 'getPaymentByProviderRef').mockResolvedValue(makePayment());
    const markSpy = vi.spyOn(db, 'markPaymentCompleted').mockResolvedValue();

    const res = await post(
      {
        id: 'sepay-txn-1',
        transferType: 'in',
        transferAmount: 49000,
        code: 'QMABC123XYZ',
        content: 'chuyen tien QMABC123XYZ',
      },
      dbMock,
      { Authorization: `Apikey ${API_KEY}` },
    );
    const body = (await res.json()) as { success: boolean };
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(markSpy).toHaveBeenCalledWith(expect.anything(), 'QMABC123XYZ');
  });

  it('(c) outgoing transfer → ignored, {"success":true}', async () => {
    const markSpy = vi.spyOn(db, 'markPaymentCompleted').mockResolvedValue();
    const res = await post(
      { transferType: 'out', transferAmount: 49000, code: 'QMABC123XYZ' },
      dbMock,
      { Authorization: `Apikey ${API_KEY}` },
    );
    const body = (await res.json()) as { success: boolean };
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(markSpy).not.toHaveBeenCalled();
  });

  it('(d) ref extracted from free-text content when code absent', async () => {
    vi.spyOn(db, 'getPaymentByProviderRef').mockResolvedValue(makePayment());
    const markSpy = vi.spyOn(db, 'markPaymentCompleted').mockResolvedValue();
    const res = await post(
      {
        transferType: 'in',
        transferAmount: 49000,
        content: 'CK tu Nguyen Van A noi dung QMABC123XYZ cam on',
      },
      dbMock,
      { Authorization: `Apikey ${API_KEY}` },
    );
    expect(res.status).toBe(200);
    expect(markSpy).toHaveBeenCalledWith(expect.anything(), 'QMABC123XYZ');
  });

  it('(e) already completed → idempotent, no second mark, {"success":true}', async () => {
    vi.spyOn(db, 'getPaymentByProviderRef').mockResolvedValue(
      makePayment({ status: 'completed' }),
    );
    const markSpy = vi.spyOn(db, 'markPaymentCompleted').mockResolvedValue();
    const res = await post(
      { transferType: 'in', transferAmount: 49000, code: 'QMABC123XYZ' },
      dbMock,
      { Authorization: `Apikey ${API_KEY}` },
    );
    const body = (await res.json()) as { success: boolean };
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(markSpy).not.toHaveBeenCalled();
  });

  it('(f) unmatched transfer → ack {"success":true}, no mark', async () => {
    const markSpy = vi.spyOn(db, 'markPaymentCompleted').mockResolvedValue();
    const res = await post(
      { transferType: 'in', transferAmount: 20000, content: 'random unrelated transfer' },
      dbMock,
      { Authorization: `Apikey ${API_KEY}` },
    );
    const body = (await res.json()) as { success: boolean };
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(markSpy).not.toHaveBeenCalled();
  });
});
