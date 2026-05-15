import { z } from 'zod';
import { MBTITypeSchema } from './mbti';

// Story 7.1 — admin login
export const AdminLoginSchema = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});
export type AdminLoginRequest = z.infer<typeof AdminLoginSchema>;

// Story 7.2 — article create / update
export const AdminArticleCreateSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1),
  mbtiType: MBTITypeSchema,
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case'),
  status: z.enum(['draft', 'published']).default('draft'),
});
export type AdminArticleCreateRequest = z.infer<typeof AdminArticleCreateSchema>;

export const AdminArticleUpdateSchema = AdminArticleCreateSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'At least one field required' },
);
export type AdminArticleUpdateRequest = z.infer<typeof AdminArticleUpdateSchema>;

// Story 7.3 — insight review
export const AdminInsightPatchSchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    content: z.string().min(1).optional(),
  })
  .refine((v) => v.status !== undefined || v.content !== undefined, {
    message: 'Provide status or content',
  });
export type AdminInsightPatchRequest = z.infer<typeof AdminInsightPatchSchema>;

export const AdminInsightCreateSchema = z.object({
  mbtiType: MBTITypeSchema,
  content: z.string().min(1),
  variant: z.string().max(80).nullable().optional(),
  source: z.enum(['ai', 'curated']).default('curated'),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
});
export type AdminInsightCreateRequest = z.infer<typeof AdminInsightCreateSchema>;
