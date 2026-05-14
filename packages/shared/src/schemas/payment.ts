import { z } from 'zod';

export const CheckoutRequestSchema = z
  .object({
    productType: z.enum(['couple_pack', 'gap_report']),
    resultId: z.string().uuid(),
    gateway: z.enum(['payos', 'stripe']).optional(),
  })
  .strict();

export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

export const CheckoutResponseSchema = z.object({
  data: z
    .object({
      checkoutUrl: z.string().url(),
    })
    .nullable(),
  error: z
    .object({ code: z.string(), message: z.string() })
    .nullable(),
});

export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;
