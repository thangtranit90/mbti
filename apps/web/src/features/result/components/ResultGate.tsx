import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { RESULT_UNLOCK_FRIEND_THRESHOLD } from '@mbti/shared';
import { shareToFacebook, copyToClipboard } from '@/lib/share';
import { safeCapture } from '@/lib/posthog';
import { useGenerateInvite } from '../hooks/useGenerateInvite';
import { useCheckout } from '@/features/payment/hooks/useCheckout';
import { PaymentQR } from '@/features/payment/components/PaymentQR';
import { EmailCaptureForm } from '@/features/payment/components/EmailCaptureForm';

type Props = {
  resultId: string;
  friendCount: number;
  threshold: number;
  /** Fired when the 2.000đ payment is confirmed — parent refetches access. */
  onUnlocked: () => void;
};

/**
 * Story 7.x — server-enforced paywall in front of the basic result.
 * Two ways to unlock (durable, bound to resultId):
 *  - Free: get RESULT_UNLOCK_FRIEND_THRESHOLD friends to finish the full test
 *    via the shared invite link.
 *  - Paid: 2.000đ via SePay VietQR.
 * Parent (ResultPage) polls /access and swaps to PersonaReveal on unlock.
 */
export function ResultGate({ resultId, friendCount, threshold, onUnlocked }: Props) {
  const rm = useReducedMotion() ?? false;
  const generateInvite = useGenerateInvite();
  const checkout = useCheckout();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Funnel state: gate (default CTA) → email (collect address) → qr (SePay).
  const [payStage, setPayStage] = useState<'gate' | 'email' | 'qr'>('gate');
  const [buyerEmail, setBuyerEmail] = useState<string | null>(null);
  const inviteUrl = generateInvite.data?.inviteUrl ?? '';
  const sepay = checkout.data?.gateway === 'sepay' ? checkout.data : null;
  const target = threshold || RESULT_UNLOCK_FRIEND_THRESHOLD;
  const done = Math.min(friendCount, target);
  const remaining = Math.max(target - friendCount, 0);

  // Mint the invite link immediately — sharing is the primary (free) path.
  const inviteOnce = useRef(false);
  useEffect(() => {
    if (inviteOnce.current) return;
    inviteOnce.current = true;
    safeCapture('result_gate_viewed', { resultId });
    generateInvite.mutate({ resultId });
  }, [resultId, generateInvite]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const flash = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const handleFacebook = () => {
    if (!inviteUrl) return;
    shareToFacebook(inviteUrl);
    safeCapture('result_gate_shared', { shareChannel: 'facebook', resultId });
    flash('Đã mở Facebook để chia sẻ.');
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    const ok = await copyToClipboard(inviteUrl);
    if (ok) {
      safeCapture('result_gate_shared', { shareChannel: 'copy_link', resultId });
      flash('Đã sao chép link! Gửi cho 2 người bạn để mở khoá miễn phí.');
    } else {
      flash('Trình duyệt không hỗ trợ sao chép.');
    }
  };

  const handlePay = () => {
    safeCapture('result_unlock_email_prompt_opened', { resultId });
    setPayStage('email');
  };

  const handleEmailSubmit = (email: string) => {
    safeCapture('result_unlock_email_submitted', { resultId });
    setBuyerEmail(email);
    checkout.mutate(
      { productType: 'result_unlock', resultId, email },
      { onSuccess: () => setPayStage('qr') },
    );
  };

  const closePaymentFlow = () => {
    setPayStage('gate');
    setBuyerEmail(null);
    checkout.reset();
  };

  return (
    <main
      id="main"
      className="min-h-svh bg-surface-deep flex items-center justify-center px-6 py-14 relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute top-[24%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] max-w-[120vw] h-[400px] rounded-full bg-cta-primary/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md bg-surface-elevated border border-[var(--hairline)] rounded-2xl shadow-[var(--shadow-e2)] px-6 py-8 sm:px-8"
        initial={{ opacity: rm ? 1 : 0, y: rm ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: rm ? 0 : 0.45 }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-cta-primary/15 border border-cta-primary/30 flex items-center justify-center mb-5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-cta-primary">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
          <h1 className="font-clash font-bold text-[26px] leading-tight tracking-[-0.01em] text-white mb-2">
            Kết quả của bạn đã sẵn sàng
          </h1>
          <p className="text-[15px] text-slate-400 leading-relaxed mb-7 max-w-[340px]">
            Còn một bước nữa để xem kiểu tính cách của bạn. Chọn một trong hai cách dưới đây.
          </p>
        </div>

        {/* Path 1 — Free: invite 2 friends */}
        <section className="rounded-xl border border-[var(--hairline)] bg-surface-deep/60 p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[15px] font-semibold text-white">
              Cách 1 — Miễn phí
            </h2>
            <span className="text-[12px] font-medium text-cta-primary bg-cta-primary/10 rounded-full px-2.5 py-1">
              Khuyên dùng
            </span>
          </div>
          <p className="text-[13px] text-slate-400 leading-relaxed mb-4">
            Mời <span className="text-white font-medium">{target} người bạn</span> làm trọn bài
            test qua link của bạn — kết quả tự mở khoá.
          </p>

          {/* Progress */}
          <div className="mb-4" aria-live="polite">
            <div className="flex items-center justify-between text-[12px] mb-1.5">
              <span className="text-slate-400">Tiến độ</span>
              <span className="text-white font-semibold" data-testid="friend-progress">
                {done}/{target} bạn đã hoàn thành
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-cta-primary"
                initial={false}
                animate={{ width: `${(done / target) * 100}%` }}
                transition={{ duration: rm ? 0 : 0.4 }}
              />
            </div>
            {remaining > 0 && (
              <p className="text-[12px] text-slate-500 mt-1.5">
                Còn {remaining} bạn nữa là mở khoá.
              </p>
            )}
          </div>

          <div
            className="bg-surface-deep border border-[var(--hairline)] rounded-lg px-3 py-2.5 text-[12px] text-slate-300 break-all select-all min-h-[42px] flex items-center mb-3"
            data-testid="gate-invite-url"
          >
            {generateInvite.isPending ? (
              <span className="text-slate-500">Đang tạo link…</span>
            ) : inviteUrl ? (
              inviteUrl
            ) : generateInvite.isError ? (
              <span className="text-slate-500">
                Không tạo được link. Hãy mở lại trang này trên thiết bị bạn đã làm bài.
              </span>
            ) : (
              <span className="text-slate-500">—</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleFacebook}
              disabled={!inviteUrl}
              data-testid="gate-facebook-btn"
              className="flex-1 h-[46px] rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-[#1877F2] text-white hover:opacity-90 transition-opacity"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6 4.39 10.97 10.13 11.85v-8.38H7.08v-3.47h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.25h3.32l-.53 3.47h-2.79v8.38C19.61 23.04 24 18.07 24 12.07Z" />
              </svg>
              Facebook
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!inviteUrl}
              data-testid="gate-copy-btn"
              className="flex-1 h-[46px] rounded-xl font-medium text-[14px] border border-white/15 text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="5" width="9" height="9" rx="1" />
                <path d="M3 11V4a1 1 0 0 1 1-1h7" />
              </svg>
              Copy link
            </button>
          </div>
        </section>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5" aria-hidden="true">
          <span className="flex-1 h-px bg-[var(--hairline)]" />
          <span className="text-[12px] text-slate-500">hoặc</span>
          <span className="flex-1 h-px bg-[var(--hairline)]" />
        </div>

        {/* Path 2 — Pay 2.000đ */}
        <section className="rounded-xl border border-[var(--hairline)] bg-surface-deep/60 p-5">
          <h2 className="text-[15px] font-semibold text-white mb-1">
            Cách 2 — Mở khoá ngay
          </h2>
          <p className="text-[13px] text-slate-400 leading-relaxed mb-4">
            Không muốn chờ? Mở khoá kết quả ngay chỉ với{' '}
            <span className="text-white font-semibold">2.000đ</span> qua chuyển khoản (VietQR).
          </p>
          <button
            type="button"
            onClick={handlePay}
            disabled={checkout.isPending}
            data-testid="gate-pay-btn"
            className="w-full h-[50px] rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 cursor-pointer bg-cta-primary hover:bg-cta-hover text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {checkout.isPending ? 'Đang tạo mã…' : 'Thanh toán 2.000đ để mở khoá'}
          </button>
          {checkout.isError && (
            <p className="text-[12px] text-red-400 mt-2 text-center">
              Không tạo được thanh toán. Hãy thử lại.
            </p>
          )}
        </section>

        <div role="status" aria-live="polite" className="min-h-[20px] text-[13px] text-center mt-4">
          {toast && <span className="text-emerald-400">{toast}</span>}
        </div>

        <div className="text-center mt-2">
          <Link
            to="/"
            className="text-[13px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            Về trang chủ
          </Link>
        </div>
      </motion.div>

      <EmailCaptureForm
        open={payStage === 'email'}
        pending={checkout.isPending}
        serverError={checkout.isError ? 'Không tạo được thanh toán. Hãy thử lại.' : null}
        onClose={closePaymentFlow}
        onSubmit={handleEmailSubmit}
      />

      {sepay && payStage === 'qr' && (
        <PaymentQR
          checkout={sepay}
          open
          recipientEmail={buyerEmail}
          onClose={closePaymentFlow}
          onCompleted={() => {
            safeCapture('result_unlock_paid', { resultId });
            onUnlocked();
            closePaymentFlow();
          }}
        />
      )}
    </main>
  );
}
