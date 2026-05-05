import { describe, it, expect } from 'vitest';
import { ConsentRequestSchema, ConsentResponseSchema } from '../src';

describe('ConsentRequestSchema', () => {
  it('accepts both literally true', () => {
    expect(() =>
      ConsentRequestSchema.parse({ consentGiven: true, ageConfirmed: true }),
    ).not.toThrow();
  });

  it('rejects false consentGiven', () => {
    expect(() =>
      ConsentRequestSchema.parse({ consentGiven: false, ageConfirmed: true }),
    ).toThrow();
  });

  it('rejects false ageConfirmed', () => {
    expect(() =>
      ConsentRequestSchema.parse({ consentGiven: true, ageConfirmed: false }),
    ).toThrow();
  });

  it('rejects missing field', () => {
    expect(() => ConsentRequestSchema.parse({ consentGiven: true })).toThrow();
  });

  it('rejects unknown extra keys (strict mode)', () => {
    expect(() =>
      ConsentRequestSchema.parse({
        consentGiven: true,
        ageConfirmed: true,
        marketingOptIn: true,
      }),
    ).toThrow();
  });
});

describe('ConsentResponseSchema', () => {
  it('accepts success envelope with ISO Z timestamps', () => {
    const ok = {
      data: {
        consentAt: '2026-05-05T10:30:00.000Z',
        ageConfirmedAt: '2026-05-05T10:30:00.000Z',
      },
      error: null,
    };
    expect(() => ConsentResponseSchema.parse(ok)).not.toThrow();
  });

  it('accepts error envelope', () => {
    const err = {
      data: null,
      error: { code: 'SESSION_GONE', message: 'expired' },
    };
    expect(() => ConsentResponseSchema.parse(err)).not.toThrow();
  });

  it('rejects mixed shape (data + error both non-null)', () => {
    const bad = {
      data: { consentAt: '2026-05-05T10:30:00.000Z', ageConfirmedAt: '2026-05-05T10:30:00.000Z' },
      error: { code: 'X', message: 'y' },
    };
    expect(() => ConsentResponseSchema.parse(bad)).toThrow();
  });

  it('rejects timestamp with +00:00 offset (not Z)', () => {
    const bad = {
      data: {
        consentAt: '2026-05-05T10:30:00.000+00:00',
        ageConfirmedAt: '2026-05-05T10:30:00.000+00:00',
      },
      error: null,
    };
    expect(() => ConsentResponseSchema.parse(bad)).toThrow();
  });
});
