import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/api';
import type { MBTIType } from '@mbti/shared';

type ArticleResponse = {
  data: {
    id: string;
    slug: string;
    title: string;
    content: string;
    author: string | null;
    mbtiType: MBTIType;
    readTimeMinutes: number;
    publishedAt: string | null;
  } | null;
  error: { code: string; message: string } | null;
};

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => apiCall<ArticleResponse>(`/api/content/articles/${slug}`),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <main id="main" className="min-h-svh bg-surface-deep px-6 py-10" aria-live="polite">
        <div className="max-w-prose mx-auto text-slate-400">Đang tải…</div>
      </main>
    );
  }
  if (isError || !data?.data) {
    return (
      <main id="main" className="min-h-svh bg-surface-deep flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-[24px] font-semibold text-white mb-3">Không tìm thấy bài viết</h1>
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className="px-6 py-3 rounded-xl bg-cta-primary hover:bg-cta-hover text-white font-medium text-[15px] cursor-pointer"
          >
            Về trang feed
          </button>
        </div>
      </main>
    );
  }

  const a = data.data;
  return (
    <main id="main" className="min-h-svh bg-surface-deep px-6 py-10">
      <div className="max-w-prose mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white text-[14px] mb-8 cursor-pointer"
          aria-label="Quay lại"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 12L6 8l4-4" />
          </svg>
          Quay lại
        </button>
        <span className={`inline-block text-[11px] uppercase tracking-[0.2em] mb-3 text-type-${a.mbtiType}`}>
          {a.mbtiType} • {a.readTimeMinutes} phút đọc
        </span>
        <h1 className="font-clash text-[32px] leading-tight text-white mb-6">{a.title}</h1>
        <article
          className="prose prose-invert max-w-none text-slate-200 text-[16px] leading-[1.6] whitespace-pre-wrap"
          // body is plain text in v1 — render as-is. Future stories can swap to MDX.
        >
          {a.content}
        </article>
      </div>
    </main>
  );
}
