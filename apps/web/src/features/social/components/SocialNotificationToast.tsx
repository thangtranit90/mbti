import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  getLatestResultId,
  useSocialNotification,
} from '../hooks/useSocialNotification';
import { safeCapture } from '@/lib/posthog';

export function SocialNotificationToast() {
  const { show, voterCount, voterName, acknowledge } = useSocialNotification();
  const navigate = useNavigate();
  const firedRef = useRef<number>(0);

  // Fire posthog `social_notification_shown` once per delta increment.
  useEffect(() => {
    if (show && firedRef.current !== voterCount) {
      firedRef.current = voterCount;
      safeCapture('social_notification_shown', {
        voterCount,
        resultId: getLatestResultId(),
      });
    }
  }, [show, voterCount]);

  const handleView = () => {
    const resultId = getLatestResultId();
    safeCapture('social_notification_tapped', { resultId, voterCount });
    acknowledge();
    if (resultId) {
      navigate(`/result/${resultId}#gap`);
    } else {
      navigate('/');
    }
  };

  const handleDismiss = () => {
    acknowledge();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25 }}
          className="fixed z-40 left-4 right-4 bottom-4 md:left-auto md:right-6 md:bottom-auto md:top-6 md:max-w-sm rounded-xl border border-white/15 bg-surface-base/95 backdrop-blur shadow-2xl px-4 py-3 flex items-center gap-3"
          data-testid="social-notification-toast"
        >
          <div className="flex-1 text-[14px] text-slate-100">
            <span className="font-semibold">{voterName ?? 'Một người'}</span>{' '}
            vừa vote về cách bạn hành xử
          </div>
          <button
            type="button"
            onClick={handleView}
            className="h-8 px-3 rounded-md bg-white text-black text-[13px] font-semibold hover:bg-white/90 cursor-pointer"
          >
            Xem
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Đóng thông báo"
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 4l8 8M12 4L4 12" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
