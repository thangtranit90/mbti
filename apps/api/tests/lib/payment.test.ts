import { describe, it, expect } from 'vitest';
import {
  createSePayCheckout,
  verifySePayApiKey,
  extractProviderRef,
} from '../../src/lib/payment';
import type { Bindings } from '../../src/types/bindings';

const env = {
  SEPAY_IPN_API_KEY: 'secret-key',
  SEPAY_BANK_ACCOUNT: '0123456789',
  SEPAY_BANK_CODE: '970436',
  SEPAY_BANK_NAME: 'Vietcombank',
} as unknown as Bindings;

describe('createSePayCheckout', () => {
  it('builds a VietQR url with our bank + amount + a QM transfer content', () => {
    const s = createSePayCheckout(env, {
      productType: 'gap_report',
      resultId: 'r1',
      userId: 'u1',
    });
    expect(s.gateway).toBe('sepay');
    expect(s.bankAccount).toBe('0123456789');
    expect(s.bankName).toBe('Vietcombank');
    expect(s.amount).toBe(25000);
    expect(s.transferContent).toMatch(/^QM[A-Z0-9]+$/);
    expect(s.providerRef).toBe(s.transferContent);
    const u = new URL(s.qrUrl);
    expect(u.host).toBe('qr.sepay.vn');
    expect(u.searchParams.get('acc')).toBe('0123456789');
    expect(u.searchParams.get('bank')).toBe('970436');
    expect(u.searchParams.get('amount')).toBe('25000');
    expect(u.searchParams.get('des')).toBe(s.transferContent);
  });

  it('generates unique transfer contents', () => {
    const a = createSePayCheckout(env, { productType: 'couple_pack', resultId: 'r', userId: 'u' });
    const b = createSePayCheckout(env, { productType: 'couple_pack', resultId: 'r', userId: 'u' });
    expect(a.transferContent).not.toBe(b.transferContent);
  });
});

describe('verifySePayApiKey', () => {
  it('accepts exact "Apikey <key>"', () => {
    expect(verifySePayApiKey(env, 'Apikey secret-key')).toBe(true);
  });
  it('rejects wrong key, missing header, wrong scheme', () => {
    expect(verifySePayApiKey(env, 'Apikey nope')).toBe(false);
    expect(verifySePayApiKey(env, undefined)).toBe(false);
    expect(verifySePayApiKey(env, 'Bearer secret-key')).toBe(false);
    expect(verifySePayApiKey(env, 'secret-key')).toBe(false);
  });
});

describe('extractProviderRef', () => {
  it('finds QM token in code', () => {
    expect(extractProviderRef({ code: 'QMABC123XYZ' })).toBe('QMABC123XYZ');
  });
  it('finds QM token embedded in free-text content (case-insensitive)', () => {
    expect(
      extractProviderRef({ content: 'ck noi dung qmabc123xyz cam on' }),
    ).toBe('QMABC123XYZ');
  });
  it('returns null when no QM token present', () => {
    expect(extractProviderRef({ content: 'unrelated transfer' })).toBeNull();
    expect(extractProviderRef({})).toBeNull();
  });
});
