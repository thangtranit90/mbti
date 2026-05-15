import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MBTIType } from '@mbti/shared';
import { adminCall } from '../lib/adminApi';

type Insight = {
  id: string;
  mbtiType: MBTIType;
  content: string;
  source: 'ai' | 'curated';
  status: 'pending' | 'approved' | 'rejected';
};

const STATUS_STYLE: Record<Insight['status'], string> = {
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  rejected: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
};

export function InsightReview() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'insights'],
    queryFn: () =>
      adminCall<{ data: { byType: Record<string, Insight[]> } | null }>(
        '/api/admin/insights',
      ),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      adminCall(`/api/admin/insights/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'insights'] }),
  });

  if (isLoading) return <p className="text-slate-400">Đang tải insights…</p>;
  const byType = data?.data?.byType ?? {};
  const types = Object.keys(byType).sort();

  return (
    <div className="space-y-8">
      <h1 className="font-clash font-bold text-2xl">Duyệt Insight</h1>
      {types.length === 0 && (
        <p className="text-slate-400 text-sm">Chưa có insight nào.</p>
      )}
      {types.map((t) => (
        <section key={t}>
          <h2 className="font-clash font-semibold text-lg mb-3">{t}</h2>
          <ul className="space-y-3">
            {byType[t].map((ins) => (
              <li
                key={ins.id}
                className="bg-surface-base border border-white/10 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`px-2 py-0.5 rounded border ${STATUS_STYLE[ins.status]}`}
                  >
                    {ins.status}
                  </span>
                  <span className="text-slate-400">nguồn: {ins.source}</span>
                </div>
                <textarea
                  defaultValue={ins.content}
                  onChange={(e) => setDraft({ ...draft, [ins.id]: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-surface-deep border border-white/10 text-white text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      patchMut.mutate({ id: ins.id, body: { status: 'approved' } })
                    }
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm cursor-pointer"
                  >
                    Duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      patchMut.mutate({ id: ins.id, body: { status: 'rejected' } })
                    }
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm cursor-pointer"
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    disabled={draft[ins.id] === undefined || draft[ins.id] === ins.content}
                    onClick={() =>
                      patchMut.mutate({ id: ins.id, body: { content: draft[ins.id] } })
                    }
                    className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 text-sm disabled:opacity-40 cursor-pointer"
                  >
                    Lưu nội dung
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
