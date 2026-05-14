import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { MBTIType } from '@mbti/shared';
import { useGenerateInvite } from '../hooks/useGenerateInvite';

type Props = {
  resultId: string;
  personaName: string;
  mbtiType: MBTIType;
};

type Toast = { kind: 'copied' | 'shared' | 'error'; text: string } | null;

export function InvitePrompt({ resultId, personaName, mbtiType }: Props) {
  const rm = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generate = useGenerateInvite();
  const inviteUrl = generate.data?.inviteUrl ?? '';

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const flashToast = (next: Exclude<Toast, null>) => {
    setToast(next);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const handleCtaClick = async () => {
    setOpen(true);
    if (!generate.data && !generate.isPending) {
      try {
        await generate.mutateAsync({ resultId });
      } catch {
        flashToast({ kind: 'error', text: 'Không tạo được link. Thử lại nhé.' });
      }
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      flashToast({ kind: 'copied', text: 'Đã sao chép link!' });
    } catch {
      flashToast({ kind: 'error', text: 'Trình duyệt không hỗ trợ sao chép.' });
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    const shareText = `Mình là ${personaName} (${mbtiType}). Bạn thấy mình thế nào? 👀`;
    const data: ShareData = { title: 'Quiet Mirror', text: shareText, url: inviteUrl };
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(data);
        flashToast({ kind: 'shared', text: 'Đã chia sẻ!' });
        return;
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
    }
    // Fallback: copy
    await handleCopy();
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <>
      <button
        type="button"
        onClick={handleCtaClick}
        className="mt-4 w-full h-[44px] text-[14px] text-slate-300 hover:text-white transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5"
        data-testid="test-your-friends-cta"
      >
        Xem bạn bè thấy bạn thế nào
        <span aria-hidden="true">→</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: rm ? 0 : 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-sheet-title"
          >
            <button
              type="button"
              aria-label="Đóng"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="relative w-full max-w-md bg-surface-base border-t border-white/10 rounded-t-2xl px-6 pt-6 pb-8 flex flex-col gap-4"
              initial={{ y: rm ? 0 : '100%' }}
              animate={{ y: 0 }}
              exit={{ y: rm ? 0 : '100%' }}
              transition={{ duration: rm ? 0 : 0.3, ease: 'easeOut' }}
            >
              <div className="flex items-start justify-between">
                <h2
                  id="invite-sheet-title"
                  className="text-[18px] font-semibold text-white"
                >
                  Mời bạn bè vote về bạn
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-slate-400 hover:text-white p-1 -m-1 cursor-pointer"
                  aria-label="Đóng"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 5l10 10M15 5L5 15" />
                  </svg>
                </button>
              </div>

              <p className="text-[14px] text-slate-300 leading-relaxed">
                Gửi link cho bạn bè để xem họ cảm nhận bạn thế nào. Link sẽ tự hết hạn sau 30 ngày.
              </p>

              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-[13px] text-slate-200 break-all select-all min-h-[48px] flex items-center" data-testid="invite-url">
                {generate.isPending ? (
                  <span className="text-slate-500">Đang tạo link…</span>
                ) : inviteUrl ? (
                  inviteUrl
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!inviteUrl || generate.isPending}
                  className={`flex-1 h-[48px] rounded-xl font-semibold text-[15px] transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-type-${mbtiType} text-white hover:opacity-90`}
                  data-testid="invite-copy-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="5" y="5" width="9" height="9" rx="1" />
                    <path d="M3 11V4a1 1 0 0 1 1-1h7" />
                  </svg>
                  Sao chép link
                </button>
                {canShare && (
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={!inviteUrl || generate.isPending}
                    className="flex-1 h-[48px] rounded-xl font-medium text-[15px] border border-white/15 text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    data-testid="invite-share-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="13" cy="3" r="1.5" />
                      <circle cx="3" cy="8" r="1.5" />
                      <circle cx="13" cy="13" r="1.5" />
                      <path d="M4.5 8.5l7-4M4.5 8l7 4" />
                    </svg>
                    Chia sẻ
                  </button>
                )}
              </div>

              <div
                role="status"
                aria-live="polite"
                className="min-h-[20px] text-[13px] text-center"
              >
                {toast && (
                  <span
                    className={
                      toast.kind === 'error' ? 'text-red-400' : 'text-green-400'
                    }
                  >
                    {toast.text}
                  </span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
