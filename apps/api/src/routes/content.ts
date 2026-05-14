import { Hono } from 'hono';
import type { Bindings, Variables } from '../types/bindings';
import { withDb, getArticlesByType, getArticleBySlug } from '../lib/db';
import { MBTI_TYPES, type MBTIType } from '@mbti/shared';

const content = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function estimateReadTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

function summarize(text: string, max = 140): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1)}…`;
}

content.get('/feed/:mbtiType', async (c) => {
  const raw = c.req.param('mbtiType').toUpperCase() as MBTIType;
  if (!MBTI_TYPES.includes(raw)) {
    return c.json(
      { data: null, error: { code: 'INVALID_TYPE', message: 'Unknown MBTI type' } },
      400,
    );
  }
  const db = withDb(c);
  const rows = await getArticlesByType(db, raw);
  return c.json({
    data: {
      articles: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        summary: summarize(r.content),
        mbtiType: r.mbti_type,
        readTimeMinutes: estimateReadTimeMinutes(r.content),
        publishedAt: r.published_at,
      })),
    },
    error: null,
  });
});

content.get('/articles/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = withDb(c);
  const row = await getArticleBySlug(db, slug);
  if (!row) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Article not found' } },
      404,
    );
  }
  return c.json({
    data: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      content: row.content,
      author: row.author,
      mbtiType: row.mbti_type,
      readTimeMinutes: estimateReadTimeMinutes(row.content),
      publishedAt: row.published_at,
    },
    error: null,
  });
});

export default content;
