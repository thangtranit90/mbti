import { useQuery } from '@tanstack/react-query';
import { adminCall } from '../lib/adminApi';

type Analytics = {
  testsByType: Record<string, number>;
  insightSourceMix: { ai: number; curated: number };
  totalTests: number;
  totalShares7d: number;
  note: string;
};

export function AnalyticsPanel() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () =>
      adminCall<{ data: Analytics | null }>('/api/admin/analytics'),
  });

  if (isLoading) return <p className="text-slate-400">Đang tải phân tích…</p>;
  if (isError || !data?.data)
    return <p className="text-rose-400">Không tải được dữ liệu phân tích.</p>;

  const a = data.data;
  const maxByType = Math.max(1, ...Object.values(a.testsByType));
  const srcTotal = a.insightSourceMix.ai + a.insightSourceMix.curated || 1;

  return (
    <div className="space-y-8">
      <h1 className="font-clash font-bold text-2xl">Phân tích</h1>
      <p className="text-xs text-slate-400">{a.note}</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-elevated border border-[var(--hairline)] rounded-2xl p-5">
          <p className="text-slate-400 text-sm mb-1">Tổng bài test</p>
          <p className="text-3xl font-clash font-bold">{a.totalTests}</p>
        </div>
        <div className="bg-surface-elevated border border-[var(--hairline)] rounded-2xl p-5">
          <p className="text-slate-400 text-sm mb-1">Lượt chia sẻ (7 ngày)</p>
          <p className="text-3xl font-clash font-bold">{a.totalShares7d}</p>
        </div>
      </div>

      <section>
        <h2 className="font-semibold mb-3">Nguồn insight (ai vs curated)</h2>
        <div className="flex h-4 rounded-full overflow-hidden border border-[var(--hairline)]">
          <div
            className="bg-cta-primary"
            style={{ width: `${(a.insightSourceMix.ai / srcTotal) * 100}%` }}
          />
          <div
            className="bg-emerald-600"
            style={{ width: `${(a.insightSourceMix.curated / srcTotal) * 100}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          AI: {a.insightSourceMix.ai} · Curated: {a.insightSourceMix.curated}
        </p>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Bài test theo type</h2>
        <div className="space-y-1.5">
          {Object.entries(a.testsByType).map(([t, n]) => (
            <div key={t} className="flex items-center gap-3 text-sm">
              <span className="w-12 text-slate-400">{t}</span>
              <div className="flex-1 bg-surface-elevated rounded-full h-3 overflow-hidden">
                <div
                  className="bg-cta-primary h-full"
                  style={{ width: `${(n / maxByType) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right text-slate-300">{n}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
