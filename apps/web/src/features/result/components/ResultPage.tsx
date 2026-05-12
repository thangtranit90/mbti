import { useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@mbti/shared';
import { apiCall } from '@/lib/api';
import { safeCapture } from '@/lib/posthog';
import type { MBTIType } from '@mbti/shared';
import { PersonaReveal } from './PersonaReveal';

type ResultApiResponse = {
  data: {
    id: string;
    mbtiType: MBTIType;
    declaredType: MBTIType | null;
    personaName: string;
    createdAt: string;
  } | null;
  error: { code: string; message: string } | null;
};

function ResultSkeleton() {
  return (
    <main
      id="main"
      className="min-h-svh bg-surface-base flex flex-col items-center justify-center px-6 gap-6"
      aria-label="Đang tải kết quả"
      aria-live="polite"
    >
      <div className="w-48 h-12 rounded-xl bg-white/8 animate-pulse" style={{ animationDuration: '1.5s' }} />
      <div className="w-16 h-px bg-white/10" />
      <div className="w-20 h-4 rounded bg-white/8 animate-pulse" style={{ animationDuration: '1.5s', animationDelay: '75ms' }} />
      <div className="flex flex-col gap-3 w-full max-w-sm mt-6">
        <div className="h-[52px] rounded-xl bg-white/8 animate-pulse" style={{ animationDuration: '1.5s', animationDelay: '150ms' }} />
        <div className="h-[52px] rounded-xl bg-white/5 animate-pulse" style={{ animationDuration: '1.5s', animationDelay: '225ms' }} />
      </div>
    </main>
  );
}

export function ResultPage() {
  const { resultId } = useParams<{ resultId: string }>();

  const { data: res, isLoading, isError } = useQuery({
    queryKey: queryKeys.testResult(resultId!),
    queryFn: () => apiCall<ResultApiResponse>(`/api/tests/${resultId}`),
    staleTime: Infinity,
    enabled: !!resultId,
  });

  const result = res?.data ?? null;

  useEffect(() => {
    if (result) {
      safeCapture('result_viewed', { resultId: result.id, mbtiType: result.mbtiType });
    }
  }, [result]);

  if (isLoading || (!result && !isError)) {
    return <ResultSkeleton />;
  }

  if (isError || !result) {
    return (
      <main id="main" className="min-h-svh bg-surface-base flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="10" cy="10" r="8" />
              <path d="M10 6v4M10 14h.01" />
            </svg>
          </div>
          <p className="text-slate-300 text-[18px] mb-6">Không tìm thấy kết quả</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cta-primary hover:bg-cta-hover text-white font-medium text-[15px] transition-colors duration-200 cursor-pointer"
          >
            Về trang chủ
          </Link>
        </div>
      </main>
    );
  }

  return <PersonaReveal personaName={result.personaName} mbtiType={result.mbtiType} />;
}
