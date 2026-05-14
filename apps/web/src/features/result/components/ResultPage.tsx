import { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@mbti/shared';
import { apiCall } from '@/lib/api';
import { safeCapture } from '@/lib/posthog';
import type { MBTIType } from '@mbti/shared';
import { PersonaReveal } from './PersonaReveal';
import { setLatestResultId } from '@/features/social/hooks/useSocialNotification';

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

type ResultInsightApiResponse = {
  data: {
    personaName: string;
    insight: string;
    villains: Array<{ type: MBTIType; reason: string }>;
  } | null;
  error: { code: string; message: string } | null;
};

type InsightGenerateApiResponse = {
  data: { content: string; source: 'ai' | 'curated' } | null;
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

  const {
    data: res,
    isLoading: isResultLoading,
    isError: isResultError,
  } = useQuery({
    queryKey: queryKeys.testResult(resultId!),
    queryFn: () => apiCall<ResultApiResponse>(`/api/tests/${resultId}`),
    staleTime: Infinity,
    enabled: !!resultId,
  });

  // Static curated insight (public GET) — provides personaName + villains for both AI and curated paths
  const {
    data: insightRes,
    isLoading: isInsightLoading,
    isError: isInsightError,
  } = useQuery({
    queryKey: queryKeys.resultInsight(resultId!),
    queryFn: () => apiCall<ResultInsightApiResponse>(`/api/results/${resultId}/insight`),
    staleTime: Infinity,
    enabled: !!resultId,
  });

  // AI-enhanced insight (POST, session-gated) — replaces curated content + source when available.
  // The query never throws — non-401 errors are reported via telemetry; UI falls back to curated.
  const { data: generateRes } = useQuery({
    queryKey: queryKeys.insightGenerate(resultId!),
    queryFn: async () => {
      try {
        return await apiCall<InsightGenerateApiResponse>('/api/insights/generate', {
          method: 'POST',
          body: JSON.stringify({ resultId }),
        });
      } catch (err) {
        const status = (err as { status?: number })?.status;
        if (status !== 401 && status !== 403) {
          safeCapture('insight_generate_error', {
            resultId,
            status: status ?? 'unknown',
          });
        }
        return { data: null, error: null } as InsightGenerateApiResponse;
      }
    },
    staleTime: Infinity,
    enabled: !!resultId,
  });

  const result = res?.data ?? null;
  const insightData = insightRes?.data ?? null;
  const generated = generateRes?.data ?? null;

  // AI content takes precedence; fall back to curated GET endpoint content.
  // Use `||` (not `??`) so empty-string AI responses also fall back.
  const finalInsight = (generated?.content || insightData?.insight) ?? '';
  const finalSource: 'ai' | 'curated' = generated?.source ?? 'curated';

  // Fire analytics exactly once per result load — not on every source flip.
  const analyticsFired = useRef(false);
  useEffect(() => {
    if (result && insightData && !analyticsFired.current) {
      analyticsFired.current = true;
      setLatestResultId(result.id);
      safeCapture('result_viewed', { resultId: result.id, mbtiType: result.mbtiType });
      safeCapture('insight_viewed', {
        resultId: result.id,
        mbtiType: result.mbtiType,
        source: finalSource,
      });
    }
  }, [result, insightData, finalSource]);

  // The curated insight (insightData) is sufficient to render the page; do NOT
  // gate the skeleton on the AI POST query — the user sees the curated insight
  // immediately and the AI badge appears later if generation succeeds.
  const isLoading = isResultLoading || isInsightLoading;
  const isError = isResultError || isInsightError;

  if (isLoading || (!result && !isError) || (!insightData && !isError)) {
    return <ResultSkeleton />;
  }

  if (isError || !result || !insightData) {
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

  return (
    <PersonaReveal
      resultId={result.id}
      personaName={insightData.personaName}
      mbtiType={result.mbtiType}
      declaredType={result.declaredType}
      insight={finalInsight}
      source={finalSource}
      villains={insightData.villains}
    />
  );
}
