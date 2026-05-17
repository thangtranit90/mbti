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
  const inviteSource = useTestStore((s) => s.inviteSource);
  const reset = useTestStore((s) => s.reset);
  const hasFired = useRef(false);

  const { mutate, isPending, isError } = useMutation({
    mutationFn: (payload: {
      answers: typeof answers;
      declaredType: typeof declaredType;
      inviteSource?: string | null;
    }) =>
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
    mutate({ answers, declaredType, inviteSource });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — fire exactly once on mount

  if (isError) {
    return (
      <main id="main" className="min-h-svh bg-surface-deep flex items-center justify-center px-6">
        <div className="text-center max-w-sm bg-surface-elevated border border-[var(--hairline)] rounded-2xl shadow-[var(--shadow-e2)] px-8 py-10">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" className="text-rose-400">
              <circle cx="10" cy="10" r="8" />
              <path d="M10 6v4M10 14h.01" />
            </svg>
          </div>
          <p className="text-slate-200 text-[16px] mb-6">Có lỗi xảy ra. Vui lòng thử lại.</p>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (isPending) return;
              hasFired.current = true;
              mutate({ answers, declaredType, inviteSource });
            }}
            className="px-6 py-3 rounded-xl bg-cta-primary hover:bg-cta-hover text-white font-semibold text-[15px] disabled:opacity-50 cursor-pointer transition-[transform,background-color] duration-[var(--dur-fast)] hover:-translate-y-[1px] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-deep"
          >
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main"
      className="min-h-svh bg-surface-base flex flex-col items-center justify-center gap-4"
      aria-label="Đang lưu kết quả"
      aria-live="polite"
    >
      <svg
        className="animate-spin text-cta-primary"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
      </svg>
      <p className="text-slate-400 text-[15px]">Đang phân tích kết quả...</p>
    </main>
  );
}
