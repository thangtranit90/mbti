import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { ConsentResponseSchema } from '@mbti/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ApiError, apiCall } from '@/lib/api';
import { SESSION_KEY, getSessionToken } from '@/lib/session';
import { safeCapture } from '@/lib/posthog';
import { AiDisclaimer } from './AiDisclaimer';

const SUBMIT_ERROR_COPY = 'Không lưu được lựa chọn. Vui lòng thử lại.';
const ROW_ERROR_COPY = 'Vui lòng xác nhận để tiếp tục';

export function ConsentGate() {
  const navigate = useNavigate();
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showRowErrors, setShowRowErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Synchronous re-entry latch — `mutation.isPending` flips on next render, so
  // a second click within the same frame would otherwise fire mutate() twice.
  const inFlightRef = useRef(false);

  const bothChecked = ageConfirmed && consentGiven;

  useEffect(() => {
    safeCapture('consent_screen_viewed');
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      const raw = await apiCall<unknown>('/api/sessions/consent', {
        method: 'PATCH',
        body: JSON.stringify({ consentGiven: true, ageConfirmed: true }),
      });
      return ConsentResponseSchema.parse(raw);
    },
    onSuccess: (res) => {
      if (res.error) {
        setSubmitError(SUBMIT_ERROR_COPY);
        return;
      }
      safeCapture('consent_granted');
      navigate('/declare');
    },
    onError: (err) => {
      // Stale token (session expired/pruned) — clear it and send back to home
      // so SessionProvider can reinitialise a fresh session.
      if (err instanceof ApiError && err.status === 401) {
        try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
        navigate('/');
        return;
      }
      console.error('consent PATCH failed:', err);
      setSubmitError(SUBMIT_ERROR_COPY);
    },
    onSettled: () => {
      inFlightRef.current = false;
    },
  });

  const handleAgeChange = (checked: boolean) => {
    setAgeConfirmed(checked);
    if (checked && consentGiven) setShowRowErrors(false);
    if (submitError) setSubmitError(null);
  };

  const handleConsentChange = (checked: boolean) => {
    setConsentGiven(checked);
    if (ageConfirmed && checked) setShowRowErrors(false);
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = () => {
    if (!bothChecked) {
      setShowRowErrors(true);
      safeCapture('consent_attempted_without_check', {
        ageConfirmed,
        consentGiven,
      });
      return;
    }
    if (inFlightRef.current || mutation.isPending) return;
    // No session token means SessionProvider's POST /api/sessions/init never
    // succeeded (private mode, direct deep-link, etc.). PATCH would 401 with an
    // opaque submit error — redirect home so the provider can re-init.
    if (!getSessionToken()) {
      navigate('/');
      return;
    }
    inFlightRef.current = true;
    setSubmitError(null);
    mutation.mutate();
  };

  return (
    <div className="min-h-svh flex items-center justify-center px-6 py-[60px] bg-surface-deep">
      <div className="w-full max-w-[480px]">
        <AiDisclaimer />

        <div className="mt-8 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <Checkbox
              id="age-confirm"
              checked={ageConfirmed}
              onCheckedChange={handleAgeChange}
              className="mt-1"
            />
            <span className="flex-1 text-[15px] text-slate-200 leading-relaxed">
              Tôi xác nhận mình từ 18 tuổi trở lên
            </span>
          </label>
          {showRowErrors && !ageConfirmed && (
            <p
              role="alert"
              aria-live="polite"
              className="text-red-400 text-[13px] -mt-2 ml-7"
            >
              {ROW_ERROR_COPY}
            </p>
          )}

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <Checkbox
              id="consent-given"
              checked={consentGiven}
              onCheckedChange={handleConsentChange}
              className="mt-1"
            />
            <span className="flex-1 text-[15px] text-slate-200 leading-relaxed">
              Tôi đồng ý cho phép thu thập câu trả lời để tạo kết quả MBTI.{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 underline underline-offset-2"
              >
                Xem chính sách bảo mật
              </a>
            </span>
          </label>
          {showRowErrors && !consentGiven && (
            <p
              role="alert"
              aria-live="polite"
              className="text-red-400 text-[13px] -mt-2 ml-7"
            >
              {ROW_ERROR_COPY}
            </p>
          )}
        </div>

        <Button
          size="lg"
          aria-disabled={!bothChecked}
          aria-busy={mutation.isPending}
          onClick={handleSubmit}
          className={`mt-8 w-full h-auto min-h-[48px] py-3 bg-[#6366F1] hover:bg-[#4F46E5] active:bg-[#3730A3] text-white text-base font-medium border-transparent ${
            bothChecked ? '' : 'opacity-60 cursor-not-allowed'
          }`}
        >
          Bắt đầu
        </Button>

        {submitError && (
          <p
            role="alert"
            aria-live="polite"
            className="text-red-400 text-[13px] text-center mt-3"
          >
            {submitError}
          </p>
        )}
      </div>
    </div>
  );
}
