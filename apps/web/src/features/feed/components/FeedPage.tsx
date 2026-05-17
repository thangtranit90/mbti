import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { MBTI_TYPES, queryKeys, type MBTIType } from '@mbti/shared';
import { apiCall } from '@/lib/api';

type FeedResponse = {
  data: {
    articles: Array<{
      id: string;
      slug: string;
      title: string;
      summary: string;
      mbtiType: MBTIType;
      readTimeMinutes: number;
    }>;
  } | null;
  error: { code: string; message: string } | null;
};

function readPreferredType(): MBTIType | null {
  try {
    const raw = localStorage.getItem('mbti-last-result-type');
    if (raw && (MBTI_TYPES as readonly string[]).includes(raw)) return raw as MBTIType;
  } catch {
    /* ignore */
  }
  return null;
}

export function FeedPage() {
  const [search, setSearch] = useSearchParams();
  const initialType = useMemo<MBTIType | null>(() => {
    const fromUrl = search.get('type')?.toUpperCase() ?? null;
    if (fromUrl && (MBTI_TYPES as readonly string[]).includes(fromUrl)) return fromUrl as MBTIType;
    return readPreferredType();
  }, [search]);

  const [selected, setSelected] = useState<MBTIType | null>(initialType);

  // Persist selection to URL for shareability + bookmarks.
  useEffect(() => {
    if (selected && search.get('type') !== selected) {
      const next = new URLSearchParams(search);
      next.set('type', selected);
      setSearch(next, { replace: true });
    }
  }, [selected, search, setSearch]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.feed(selected ?? 'INFP'),
    queryFn: () => apiCall<FeedResponse>(`/api/content/feed/${selected}`),
    enabled: !!selected,
    staleTime: 5 * 60 * 1000,
  });

  if (!selected) {
    return (
      <main
        id="main"
        className="min-h-svh bg-surface-deep px-6 py-12 flex flex-col items-center"
      >
        <h1 className="font-clash text-[26px] font-bold tracking-[-0.01em] text-white mb-2 text-center">
          Chọn kiểu của bạn
        </h1>
        <p className="text-slate-400 text-[14px] mb-8 text-center">
          Để chúng tôi gợi ý bài viết phù hợp.
        </p>
        <div className="grid grid-cols-4 gap-2 max-w-md w-full">
          {MBTI_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelected(t)}
              className={`h-12 rounded-xl border border-[var(--hairline)] bg-surface-elevated shadow-[var(--shadow-e1)] text-[13px] font-semibold hover:-translate-y-[1px] hover:border-[var(--hairline-strong)] transition-[transform,border-color] duration-[var(--dur-fast)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-deep text-type-${t}`}
            >
              {t}
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main
      id="main"
      className="min-h-svh bg-surface-deep px-6 py-10 max-w-[960px] mx-auto"
    >
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="font-clash text-[26px] font-bold tracking-[-0.01em] text-white">
          Cho {selected}
        </h1>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="text-[13px] text-slate-400 hover:text-white cursor-pointer underline-offset-4 hover:underline"
        >
          Đổi kiểu
        </button>
      </header>

      {isLoading && (
        <div role="status" aria-live="polite" className="text-slate-400">
          Đang tải bài viết…
        </div>
      )}
      {isError && (
        <div role="alert" className="text-rose-400">
          Không tải được bài viết. Vui lòng thử lại.
        </div>
      )}

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data?.data?.articles ?? []).map((a) => (
          <li
            key={a.id}
            className="rounded-2xl border border-[var(--hairline)] bg-surface-elevated shadow-[var(--shadow-e1)] p-5 hover:-translate-y-[2px] hover:border-[var(--hairline-strong)] transition-[transform,border-color] duration-[var(--dur-fast)]"
          >
            <Link to={`/feed/${a.slug}`} className="block cursor-pointer">
              <span
                className={`inline-block text-[11px] uppercase tracking-[0.2em] mb-3 text-type-${a.mbtiType}`}
              >
                {a.mbtiType} • {a.readTimeMinutes} phút đọc
              </span>
              <h2 className="text-[18px] font-semibold text-white mb-2 leading-snug">
                {a.title}
              </h2>
              <p className="text-[14px] text-slate-300 leading-relaxed line-clamp-2">
                {a.summary}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
