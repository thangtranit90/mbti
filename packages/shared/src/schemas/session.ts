import { z } from 'zod';

export const SessionInitResponseSchema = z.union([
  z.object({
    data: z.object({ sessionToken: z.string().uuid() }),
    error: z.null(),
  }),
  z.object({
    data: z.null(),
    error: z.object({ code: z.string(), message: z.string() }),
  }),
]);

export type SessionInitResponse = z.infer<typeof SessionInitResponseSchema>;

// PATCH /api/sessions/consent — both flags must be literally true; false fails validation.
// `.strict()` rejects unknown keys so client tampering or schema drift surface as 400 rather than silent acceptance.
export const ConsentRequestSchema = z
  .object({
    consentGiven: z.literal(true),
    ageConfirmed: z.literal(true),
  })
  .strict();

export type ConsentRequest = z.infer<typeof ConsentRequestSchema>;

export const ConsentResponseSchema = z.union([
  z.object({
    data: z.object({
      consentAt: z.string().datetime({ offset: false }),
      ageConfirmedAt: z.string().datetime({ offset: false }),
    }),
    error: z.null(),
  }),
  z.object({
    data: z.null(),
    error: z.object({ code: z.string(), message: z.string() }),
  }),
]);

export type ConsentResponse = z.infer<typeof ConsentResponseSchema>;
