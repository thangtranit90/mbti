import { useQuery } from '@tanstack/react-query';
import { MBTI_TYPES } from '@mbti/shared';
import { adminCall } from '../lib/adminApi';

type Metrics = {
  totalCompletedTests: number;
  activeInviteLinks: number;
  shareRate7d: number;
  completionRate: number;
  articleCountPerType: Record<string, number>;
};

const THRESHOLD = 3;

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-base border border-white/10 rounded-2xl p-5">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className="text-3xl font-clash font-bold text-white">{value}</p>
    </div>
  );
}

export function AdminDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () =>
      adminCall<{ data: Metrics | null; error: unknown }>('/api/admin/metrics'),
  });

  if (isLoading) return <p className="text-slate-400">Đang tải số liệu…</p>;
  if (isError || !data?.data)
    return <p className="text-rose-400">Không tải được số liệu.</p>;

  const m = data.data;
  const lowTypes = MBTI_TYPES.filter((t) => (m.articleCountPerType[t] ?? 0) < THRESHOLD);

  return (
    <div className="space-y-8">
      <h1 className="font-clash font-bold text-2xl">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile label="Tổng bài test hoàn thành" value={String(m.totalCompletedTests)} />
        <Tile label="Link mời đang hoạt động" value={String(m.activeInviteLinks)} />
        <Tile label="Tỉ lệ chia sẻ (7 ngày)" value={`${Math.round(m.shareRate7d * 100)}%`} />
        <Tile label="Tỉ lệ hoàn thành" value={`${Math.round(m.completionRate * 100)}%`} />
      </div>

      <section>
        <h2 className="font-clash font-semibold text-lg mb-3">
          Cảnh báo ngưỡng nội dung (&lt; {THRESHOLD} bài/type)
        </h2>
        {lowTypes.length === 0 ? (
          <p className="text-emerald-400 text-sm">
            Tất cả 16 type đều đủ nội dung tối thiểu.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {lowTypes.map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm"
              >
                {t}: {m.articleCountPerType[t] ?? 0} bài
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
