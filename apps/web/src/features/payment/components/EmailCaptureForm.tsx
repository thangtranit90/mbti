import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

type Props = {
  open: boolean;
  pending: boolean;
  /** Server-side error from checkout mutation (e.g. EMAIL_REQUIRED, GATEWAY_ERROR). */
  serverError?: string | null;
  onClose: () => void;
  onSubmit: (email: string) => void;
};

// Modal that collects buyer email before opening the SePay QR. Validation is
// HTML5 + a permissive regex; the server is the source of truth. The inner
// `Dialog` is mounted only while `open` is true, so its state resets cleanly
// every time the modal re-opens.
export function EmailCaptureForm(props: Props) {
  const rm = useReducedMotion() ?? false;
  return (
    <AnimatePresence>
      {props.open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: rm ? 0 : 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-capture-title"
        >
          <button
            type="button"
            aria-label="Đóng"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
            onClick={props.onClose}
          />
          <Dialog {...props} reducedMotion={rm} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Dialog({
  pending,
  serverError,
  onClose,
  onSubmit,
  reducedMotion: rm,
}: Props & { reducedMotion: boolean }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  // Focus the input once on mount; setState already resets via remount.
  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const trimmed = email.trim();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && trimmed.length <= 254;
  const localError = touched && !isValid ? 'Email chưa hợp lệ. Vui lòng kiểm tra lại.' : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid || pending) return;
    onSubmit(trimmed.toLowerCase());
  };

  return (
    <>
      <motion.form
            onSubmit={handleSubmit}
            noValidate
            className="relative w-full max-w-sm bg-surface-elevated border border-[var(--hairline)] rounded-2xl shadow-[var(--shadow-e3)] p-6 flex flex-col gap-4 text-center"
            initial={{ scale: rm ? 1 : 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: rm ? 1 : 0.96, opacity: 0 }}
          >
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-cta-primary/15 border border-cta-primary/30 flex items-center justify-center mb-3">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="text-cta-primary"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </div>
              <h2
                id="email-capture-title"
                className="font-clash font-bold text-[20px] leading-tight tracking-[-0.01em] text-white"
              >
                Nhập email để nhận kết quả
              </h2>
              <p className="text-[13px] text-slate-400 leading-relaxed mt-2 max-w-[300px]">
                Sau khi thanh toán thành công, chúng tôi sẽ gửi link kết quả vào
                email này để bạn xem lại bất cứ lúc nào.
              </p>
            </div>

            <div className="text-left">
              <label
                htmlFor={inputId}
                className="block text-[12px] font-medium text-slate-300 mb-1.5"
              >
                Email của bạn
              </label>
              <input
                id={inputId}
                ref={inputRef}
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                placeholder="ban@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                disabled={pending}
                data-testid="email-capture-input"
                aria-invalid={localError ? 'true' : 'false'}
                aria-describedby={localError ? `${inputId}-err` : undefined}
                className="w-full h-[46px] rounded-xl px-3.5 bg-surface-deep border border-[var(--hairline)] text-white text-[15px] placeholder:text-slate-500 focus:outline-none focus:border-cta-primary/60 focus:ring-2 focus:ring-cta-primary/25 disabled:opacity-60"
              />
              {localError && (
                <p
                  id={`${inputId}-err`}
                  className="text-[12px] text-red-400 mt-1.5"
                  role="alert"
                >
                  {localError}
                </p>
              )}
              {!localError && serverError && (
                <p className="text-[12px] text-red-400 mt-1.5" role="alert">
                  {serverError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={pending}
              data-testid="email-capture-submit"
              className="w-full h-[50px] rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 cursor-pointer bg-cta-primary hover:bg-cta-hover text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? 'Đang tạo mã…' : 'Tiếp tục đến thanh toán'}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="text-slate-400 hover:text-white text-[13px] cursor-pointer disabled:opacity-50"
            >
              Huỷ
            </button>
          </motion.form>
    </>
  );
}
