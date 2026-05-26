import { z } from 'zod';

export const CheckoutRequestSchema = z
  .object({
    productType: z.enum(['couple_pack', 'gap_report', 'result_unlock']),
    resultId: z.string().uuid(),
    gateway: z.enum(['sepay', 'stripe']).optional(),
    // Buyer email — required for `result_unlock` so we can email the
    // result link after payment. The route handler enforces presence;
    // here we just validate shape.
    email: z.string().trim().toLowerCase().email().max(254).optional(),
  })
  .strict();

export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

// Stripe: redirect to hosted checkout. SePay: render a VietQR + bank info and
// poll the payment status endpoint until completed.
export const StripeCheckoutDataSchema = z.object({
  gateway: z.literal('stripe'),
  paymentId: z.string().uuid(),
  checkoutUrl: z.string().url(),
});

export const SePayCheckoutDataSchema = z.object({
  gateway: z.literal('sepay'),
  paymentId: z.string().uuid(),
  qrUrl: z.string().url(),
  transferContent: z.string().min(1),
  amount: z.number().int().positive(),
  bankAccount: z.string().min(1),
  bankName: z.string().min(1),
});

export const CheckoutResponseSchema = z.object({
  data: z.union([StripeCheckoutDataSchema, SePayCheckoutDataSchema]).nullable(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
});

export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;

export const PaymentStatusResponseSchema = z.object({
  data: z
    .object({ status: z.enum(['pending', 'completed', 'failed']) })
    .nullable(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
});

export type PaymentStatusResponse = z.infer<typeof PaymentStatusResponseSchema>;
