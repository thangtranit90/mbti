import { Hono } from 'hono';
import type { Bindings, Variables } from '../types/bindings';
import { withDb, getReportRow } from '../lib/db';

const reports = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

reports.get('/:reportId', async (c) => {
  const reportId = c.req.param('reportId');
  if (!UUID_RE.test(reportId)) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Report not found' } },
      404,
    );
  }
  const db = withDb(c);
  const row = await getReportRow(db, reportId);
  if (!row) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Report not found' } },
      404,
    );
  }
  const obj = await c.env.ASSETS_BUCKET.get(row.r2_key);
  if (!obj) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Report payload missing' } },
      404,
    );
  }
  const json = await obj.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return c.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Report parse failed' } },
      500,
    );
  }
  return c.json({ data: parsed, error: null });
});

export default reports;
