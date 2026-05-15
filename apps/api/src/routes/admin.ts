import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Bindings, Variables } from '../types/bindings';
import { requireAdmin } from '../middleware/auth';
import { verifyAdminPassword } from '../lib/adminAuth';
import { setAdminSession } from '../lib/kv';
import {
  withDb,
  getAdminMetrics,
  getAllArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  getAllInsights,
  updateInsightStatus,
  updateInsightContent,
  createCuratedInsight,
  getAnalyticsSummary,
} from '../lib/db';
import {
  AdminLoginSchema,
  AdminArticleCreateSchema,
  AdminArticleUpdateSchema,
  AdminInsightPatchSchema,
  AdminInsightCreateSchema,
  type CuratedInsightRow,
} from '@mbti/shared';

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>();

async function parseJson(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

// --- Story 7.1: login (public) -------------------------------------
admin.post('/login', async (c) => {
  const payload = await parseJson(c);
  if (payload === undefined) {
    return c.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      400,
    );
  }
  const { username, password } = AdminLoginSchema.parse(payload);
  const ok = await verifyAdminPassword(password, c.env.ADMIN_PASSWORD_HASH);
  if (!ok) {
    return c.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Invalid credentials' } },
      403,
    );
  }
  const adminToken = crypto.randomUUID();
  await setAdminSession(c.env.KV, adminToken, {
    username,
    createdAt: new Date().toISOString(),
  });
  return c.json({ data: { adminToken }, error: null });
});

// --- Everything below requires a valid admin token -----------------
// MAINTAINER GUARDRAIL: only `POST /login` is public. EVERY other admin route
// MUST have a matching `admin.use('<path>', requireAdmin)` line below (both the
// exact path AND a `/*` wildcard for param routes). Adding a route without its
// guard ships it UNAUTHENTICATED. Keep this list in sync with the handlers.
admin.use('/metrics', requireAdmin);
admin.use('/articles', requireAdmin);
admin.use('/articles/*', requireAdmin);
admin.use('/insights', requireAdmin);
admin.use('/insights/*', requireAdmin);
admin.use('/analytics', requireAdmin);

// --- Story 7.1 / 7.2: metrics --------------------------------------
admin.get('/metrics', async (c) => {
  const db = withDb(c);
  const metrics = await getAdminMetrics(db);
  return c.json({ data: metrics, error: null });
});

// --- Story 7.2: article CRUD ---------------------------------------
function articleView(r: {
  id: string;
  mbti_type: string;
  slug: string;
  title: string;
  content: string;
  is_published: 0 | 1;
  published_at: string | null;
  updated_at: string;
}) {
  return {
    id: r.id,
    mbtiType: r.mbti_type,
    slug: r.slug,
    title: r.title,
    body: r.content,
    status: r.is_published ? 'published' : 'draft',
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
  };
}

admin.get('/articles', async (c) => {
  const db = withDb(c);
  const rows = await getAllArticles(db);
  return c.json({ data: { articles: rows.map(articleView) }, error: null });
});

admin.post('/articles', async (c) => {
  const payload = await parseJson(c);
  if (payload === undefined) {
    return c.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      400,
    );
  }
  const body = AdminArticleCreateSchema.parse(payload);
  const db = withDb(c);
  const id = crypto.randomUUID();
  try {
    await createArticle(db, { id, ...body });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('UNIQUE') || msg.includes('constraint')) {
      return c.json(
        { data: null, error: { code: 'CONFLICT', message: 'Slug already exists' } },
        409,
      );
    }
    throw err;
  }
  return c.json({ data: { id }, error: null }, 201);
});

admin.patch('/articles/:id', async (c) => {
  const payload = await parseJson(c);
  if (payload === undefined) {
    return c.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      400,
    );
  }
  const patch = AdminArticleUpdateSchema.parse(payload);
  const db = withDb(c);
  const found = await updateArticle(db, c.req.param('id'), patch);
  if (!found) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Article not found' } },
      404,
    );
  }
  return c.json({ data: { updated: true }, error: null });
});

admin.delete('/articles/:id', async (c) => {
  const db = withDb(c);
  const removed = await deleteArticle(db, c.req.param('id'));
  if (!removed) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Article not found' } },
      404,
    );
  }
  return c.json({ data: { deleted: true }, error: null });
});

// --- Story 7.3: insight review -------------------------------------
function insightView(r: CuratedInsightRow) {
  return {
    id: r.id,
    mbtiType: r.mbti_type,
    variant: r.variant,
    content: r.content,
    source: r.source,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

admin.get('/insights', async (c) => {
  const db = withDb(c);
  const rows = await getAllInsights(db);
  const grouped: Record<string, ReturnType<typeof insightView>[]> = {};
  for (const r of rows) {
    (grouped[r.mbti_type] ??= []).push(insightView(r));
  }
  return c.json({ data: { byType: grouped }, error: null });
});

admin.post('/insights', async (c) => {
  const payload = await parseJson(c);
  if (payload === undefined) {
    return c.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      400,
    );
  }
  const body = AdminInsightCreateSchema.parse(payload);
  const db = withDb(c);
  const id = crypto.randomUUID();
  await createCuratedInsight(db, {
    id,
    mbtiType: body.mbtiType,
    content: body.content,
    variant: body.variant ?? null,
    source: body.source,
    status: body.status,
  });
  return c.json({ data: { id }, error: null }, 201);
});

admin.patch('/insights/:id', async (c) => {
  const payload = await parseJson(c);
  if (payload === undefined) {
    return c.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      400,
    );
  }
  const patch = AdminInsightPatchSchema.parse(payload);
  const db = withDb(c);
  const id = c.req.param('id');
  let touched = false;
  if (patch.status !== undefined) {
    touched = (await updateInsightStatus(db, id, patch.status)) || touched;
  }
  if (patch.content !== undefined) {
    touched = (await updateInsightContent(db, id, patch.content)) || touched;
  }
  if (!touched) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Insight not found' } },
      404,
    );
  }
  return c.json({ data: { updated: true }, error: null });
});

// --- Story 7.4: analytics ------------------------------------------
admin.get('/analytics', async (c) => {
  const db = withDb(c);
  const summary = await getAnalyticsSummary(db);
  return c.json({
    data: { ...summary, note: 'D1-derived proxy (PostHog query API out of scope for Worker)' },
    error: null,
  });
});

export default admin;
