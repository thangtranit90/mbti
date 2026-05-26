import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { SePayCheckoutData } from '../hooks/useCheckout';
import { usePaymentStatus } from '../hooks/usePaymentStatus';

type Props = {
  checkout: SePayCheckoutData;
  open: boolean;
  /** Buyer email collected upstream — shown as a reassurance line under the QR. */
  recipientEmail?: string | null;
  onClose: () => void;
  onCompleted: () => void;
};

const formatVnd = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export function PaymentQR({ checkout, open, recipientEmail, onClose, onCompleted }: Props) {
  const rm = useReducedMotion() ?? false;
  const { data } = usePaymentStatus(checkout.paymentId, open);
  const status = data?.data?.status ?? 'pending';
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'completed') onCompleted();
  }, [status, onCompleted]);

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(checkout.transferContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: rm ? 0 : 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-qr-title"
        >
          <button
            type="button"
            aria-label="Đóng"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-sm bg-surface-elevated border border-[var(--hairline)] rounded-2xl shadow-[var(--shadow-e3)] p-6 flex flex-col items-center gap-4 text-center"
            initial={{ scale: rm ? 1 : 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: rm ? 1 : 0.96, opacity: 0 }}
          >
            <h2 id="payment-qr-title" className="text-[18px] font-semibold text-white">
              Quét mã để chuyển khoản
            </h2>

            {status === 'completed' ? (
              <div className="py-8 flex flex-col items-center gap-3" data-testid="payment-success">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-emerald-400">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-emerald-400 font-semibold">Thanh toán thành công!</p>
              </div>
            ) : (
              <>
                <img
                  src={checkout.qrUrl}
                  alt="Mã QR chuyển khoản VietQR"
                  width={224}
                  height={224}
                  className="rounded-xl bg-white p-2"
                />
                <div className="w-full text-[13px] text-slate-300 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ngân hàng</span>
                    <span>{checkout.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Số tài khoản</span>
                    <span className="font-mono">{checkout.bankAccount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Số tiền</span>
                    <span className="font-semibold text-white">{formatVnd(checkout.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-400">Nội dung</span>
                    <button
                      type="button"
                      onClick={copyContent}
                      className="font-mono text-white underline underline-offset-2 cursor-pointer"
                      data-testid="copy-transfer-content"
                    >
                      {copied ? 'Đã chép!' : checkout.transferContent}
                    </button>
                  </div>
                </div>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  Mở app ngân hàng, quét mã. Giữ nguyên <strong>nội dung chuyển khoản</strong> để
                  hệ thống tự xác nhận. Màn hình sẽ tự cập nhật sau khi nhận được tiền.
                </p>
                {recipientEmail && (
                  <p className="text-[12px] text-slate-500 leading-relaxed -mt-1">
                    Link kết quả sẽ được gửi đến{' '}
                    <span className="text-slate-300 font-medium break-all">{recipientEmail}</span>{' '}
                    sau khi thanh toán thành công.
                  </p>
                )}
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-2 text-[13px] text-slate-400"
                >
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
                  </svg>
                  Đang chờ thanh toán…
                </div>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white text-[13px] cursor-pointer mt-1"
            >
              {status === 'completed' ? 'Đóng' : 'Để sau'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
