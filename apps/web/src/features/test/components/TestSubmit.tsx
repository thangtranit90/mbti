import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useTestStore } from '../store/useTestStore';
import { apiCall } from '@/lib/api';
import { safeCapture } from '@/lib/posthog';
import type { TestSubmitResponse } from '@mbti/shared';

export function TestSubmit() {
  const navigate = useNavigate();
  const answers = useTestStore((s) => s.answers);
  const declaredType = useTestStore((s) => s.declaredType);
  const reset = useTestStore((s) => s.reset);
  const hasFired = useRef(false);

  const { mutate, isPending, isError } = useMutation({
    mutationFn: (payload: { answers: typeof answers; declaredType: typeof declaredType }) =>
      apiCall<TestSubmitResponse>('/api/tests/submit', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (res) => {
      safeCapture('test_submitted', { mbtiType: res.data.mbtiType });
      reset();
      navigate(`/result/${res.data.resultId}`, { replace: true });
    },
  });

  useEffect(() => {
    if (answers.length === 0) {
      navigate('/', { replace: true });
      return;
    }
    if (hasFired.current) return;
    hasFired.current = true;
    mutate({ answers, declaredType });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — fire exactly once on mount

  if (isError) {
    return (
      <div className="min-h-svh bg-[#0D0F1A] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-slate-300 text-[16px] mb-6">Có lỗi xảy ra. Vui lòng thử lại.</p>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (isPending) return;
              hasFired.current = true;
              mutate({ answers, declaredType });
            }}
            className="px-6 py-3 rounded-xl bg-[#818CF8] text-white font-medium text-[15px] disabled:opacity-50"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return <div className="min-h-svh bg-[#0D0F1A]" aria-label="Đang lưu kết quả" />;
}
