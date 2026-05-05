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
    return <div className="min-h-svh bg-[#0D0F1A]" aria-label="Đang tải kết quả" />;
  }

  if (isError || !result) {
    return (
      <div className="min-h-svh bg-[#0D0F1A] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-slate-300 text-[18px] mb-6">Không tìm thấy kết quả</p>
          <Link
            to="/"
            className="px-6 py-3 rounded-xl bg-[#818CF8] text-white font-medium text-[15px]"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return <PersonaReveal personaName={result.personaName} mbtiType={result.mbtiType} />;
}
