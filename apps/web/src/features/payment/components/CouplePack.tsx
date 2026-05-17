import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PRODUCT_CATALOG, type MBTIType } from '@mbti/shared';
import { useCheckout } from '../hooks/useCheckout';
import { PaymentQR } from './PaymentQR';

type Props = {
  resultId: string;
  mbtiType: MBTIType;
};

const PRICE = PRODUCT_CATALOG.couple_pack.amount;

const formatVnd = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export function CouplePack({ resultId, mbtiType }: Props) {
  const rm = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const checkout = useCheckout();

  const sepay =
    checkout.data?.gateway === 'sepay' ? checkout.data : null;

  const handlePay = () => {
    checkout.mutate({ productType: 'couple_pack', resultId });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-3 w-full h-[44px] rounded-xl border border-type-${mbtiType}/40 text-type-${mbtiType} hover:bg-white/5 text-[14px] font-medium cursor-pointer`}
        data-testid="couple-pack-cta"
      >
        Mua Couple Pack ({formatVnd(PRICE)})
      </button>

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
            aria-labelledby="couple-pack-title"
          >
            <button
              type="button"
              aria-label="Đóng"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="relative w-full max-w-sm bg-surface-elevated border border-[var(--hairline)] rounded-2xl shadow-[var(--shadow-e3)] p-6 flex flex-col gap-4"
              initial={{ scale: rm ? 1 : 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: rm ? 1 : 0.96, opacity: 0 }}
            >
              <h2 id="couple-pack-title" className="text-[20px] font-semibold text-white">
                Couple/Friend Pack
              </h2>
              <p className="text-[14px] text-slate-300 leading-relaxed">
                Báo cáo tương thích đầy đủ cho hai người. Cả bạn và bạn của bạn cùng nhận được link
                xem báo cáo — không cần đăng nhập.
              </p>
              <div className={`text-[28px] font-clash text-type-${mbtiType}`}>
                {formatVnd(PRICE)}
              </div>
              <button
                type="button"
                onClick={handlePay}
                disabled={checkout.isPending}
                className={`mt-2 w-full h-[48px] rounded-xl font-semibold text-[15px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-type-${mbtiType} text-white hover:opacity-90`}
                data-testid="couple-pack-pay-btn"
              >
                {checkout.isPending ? 'Đang chuyển hướng…' : 'Thanh toán'}
              </button>
              {checkout.isError && (
                <p role="alert" className="text-rose-400 text-[13px] text-center">
                  Không tạo được phiên thanh toán. Vui lòng thử lại.
                </p>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white text-[13px] cursor-pointer"
              >
                Để sau
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {sepay && (
        <PaymentQR
          checkout={sepay}
          open={open}
          onClose={() => {
            setOpen(false);
            checkout.reset();
          }}
          onCompleted={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
