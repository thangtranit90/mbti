// Tailwind JIT safelist — DO NOT DELETE these comments
// text-type-INTJ text-type-INTP text-type-ENTJ text-type-ENTP
// text-type-INFJ text-type-INFP text-type-ENFJ text-type-ENFP
// text-type-ISTJ text-type-ISFJ text-type-ESTJ text-type-ESFJ
// text-type-ISTP text-type-ISFP text-type-ESTP text-type-ESFP
// bg-type-INTJ bg-type-INTP bg-type-ENTJ bg-type-ENTP
// bg-type-INFJ bg-type-INFP bg-type-ENFJ bg-type-ENFP
// bg-type-ISTJ bg-type-ISFJ bg-type-ESTJ bg-type-ESFJ
// bg-type-ISTP bg-type-ISFP bg-type-ESTP bg-type-ESFP
// border-type-INTJ border-type-INTP border-type-ENTJ border-type-ENTP
// border-type-INFJ border-type-INFP border-type-ENFJ border-type-ENFP
// border-type-ISTJ border-type-ISFJ border-type-ESTJ border-type-ESFJ
// border-type-ISTP border-type-ISFP border-type-ESTP border-type-ESFP

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { MBTIType } from '@mbti/shared';
import { generateAndShare, shareToFacebook, copyToClipboard } from '@/lib/share';
import { safeCapture } from '@/lib/posthog';
import { useGenerateInvite } from '../hooks/useGenerateInvite';
import { InsightCard } from './InsightCard';
import { VillainsSection } from './VillainsSection';
import { ReverseReveal } from './ReverseReveal';
import { ShareCard } from './ShareCard';
import { InvitePrompt } from './InvitePrompt';
import { GapVisualization } from '@/features/social/components/GapVisualization';
import { LoopStatus } from '@/features/social/components/LoopStatus';
import { useSocialStatus } from '@/features/social/hooks/useSocialStatus';
import { CouplePack } from '@/features/payment/components/CouplePack';
import { useCheckout } from '@/features/payment/hooks/useCheckout';
import { PaymentQR } from '@/features/payment/components/PaymentQR';

type Props = {
  resultId: string;
  personaName: string;
  mbtiType: MBTIType;
  declaredType: MBTIType | null;
  insight: string;
  source: 'ai' | 'curated';
  villains: Array<{ type: MBTIType; reason: string }>;
};

export function PersonaReveal({
  resultId,
  personaName,
  mbtiType,
  declaredType,
  insight,
  source,
  villains,
}: Props) {
  const rm = useReducedMotion() ?? false;
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generateInvite = useGenerateInvite();
  // The shared link is an INVITE link, not /result/:id — recipients land on
  // InviteeLanding → 3 perception questions → the full 12-question test. This
  // fixes the bug where a shared link only showed the sender's result.
  const inviteUrl = generateInvite.data?.inviteUrl ?? '';
  const { data: socialStatus } = useSocialStatus();
  const status = socialStatus?.data ?? null;
  const voterCount = status?.voterCount ?? 0;
  const checkout = useCheckout();
  const gapSepay = checkout.data?.gateway === 'sepay' ? checkout.data : null;
  const unlockGapReport = () =>
    checkout.mutate({ productType: 'gap_report', resultId });

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (shareToastTimer.current) clearTimeout(shareToastTimer.current);
    },
    [],
  );

  const flashShareToast = (msg: string) => {
    setShareToast(msg);
    if (shareToastTimer.current) clearTimeout(shareToastTimer.current);
    shareToastTimer.current = setTimeout(() => setShareToast(null), 2500);
  };

  // Open the share sheet and lazily mint the invite link.
  const openShareSheet = async () => {
    setShareOpen(true);
    if (!generateInvite.data && !generateInvite.isPending) {
      try {
        await generateInvite.mutateAsync({ resultId });
      } catch {
        flashShareToast('Không tạo được link. Thử lại nhé.');
      }
    }
  };

  const handleFacebook = () => {
    if (!inviteUrl) return;
    shareToFacebook(inviteUrl);
    safeCapture('result_shared', { shareChannel: 'facebook', resultId });
    flashShareToast('Đã mở Facebook để chia sẻ.');
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    const ok = await copyToClipboard(inviteUrl);
    if (ok) {
      safeCapture('result_shared', { shareChannel: 'copy_link', resultId });
      flashShareToast('Đã sao chép link! Gửi cho bạn bè để mở khoá miễn phí.');
    } else {
      flashShareToast('Trình duyệt không hỗ trợ sao chép.');
    }
  };

  // Secondary: download the Stories-format share card image (UX hero card).
  const handleDownloadCard = async () => {
    if (!shareCardRef.current) return;
    const outcome = await generateAndShare(
      shareCardRef.current,
      `mbti-${mbtiType}-result.png`,
      `Kết quả MBTI của tôi: ${personaName} — ${mbtiType}.`,
      inviteUrl || window.location.href,
    );
    if (outcome === 'copied' || outcome === 'downloaded') {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main
      id="main"
      className="min-h-svh bg-surface-base flex flex-col items-center px-6 relative overflow-x-hidden"
    >
      {/* Type-specific radial glow */}
      <div
        className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-25 bg-type-${mbtiType} pointer-events-none`}
        aria-hidden="true"
      />
      <div
        className={`absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10 bg-type-${mbtiType} pointer-events-none`}
        aria-hidden="true"
      />

      {/* Centered full-screen reveal block */}
      <div className="min-h-svh flex flex-col items-center justify-center w-full">
        <div className="relative z-10 flex flex-col items-center text-center gap-4 max-w-sm w-full">
          {/* Beat 1: Persona name (0ms) */}
          <motion.h1
            className={`font-clash text-[56px] leading-tight text-type-${mbtiType}`}
            style={{ fontSize: 'clamp(2.5rem, 10vw, 4rem)' }}
            initial={{ opacity: rm ? 1 : 0, y: rm ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: rm ? 0 : 0.6, delay: 0 }}
          >
            {personaName}
          </motion.h1>

          {/* Divider (1200ms) */}
          <motion.hr
            className={`border-type-${mbtiType} w-16 border-t`}
            initial={{ opacity: rm ? 1 : 0, scaleX: rm ? 1 : 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: rm ? 0 : 0.4, delay: rm ? 0 : 1.2 }}
            aria-hidden="true"
          />

          {/* Beat 2: Insight (800ms) */}
          <InsightCard insight={insight} source={source} />

          {/* Beat 3: Type code (1400ms) */}
          <motion.p
            className={`text-[14px] tracking-[0.3em] uppercase text-type-${mbtiType}`}
            initial={{ opacity: rm ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: rm ? 0 : 0.3, delay: rm ? 0 : 1.4 }}
          >
            {mbtiType}
          </motion.p>

          {/* Actions */}
          <motion.div
            className="flex flex-col gap-3 w-full mt-6"
            initial={{ opacity: rm ? 1 : 0, y: rm ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: rm ? 0 : 0.4, delay: rm ? 0 : 1.6 }}
          >
            <button
              type="button"
              onClick={openShareSheet}
              data-testid="share-result-cta"
              className={`w-full h-[52px] rounded-xl font-semibold text-[15px] cursor-pointer transition-colors duration-200 flex items-center justify-center gap-2 bg-type-${mbtiType} text-white hover:opacity-90 active:opacity-80`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="13" cy="3" r="1.5" />
                <circle cx="3" cy="8" r="1.5" />
                <circle cx="13" cy="13" r="1.5" />
                <path d="M4.5 8.5l7-4M4.5 8l7 4" />
              </svg>
              Chia sẻ kết quả
            </button>

            <Link
              to="/"
              className="w-full h-[52px] rounded-xl font-medium text-[15px] cursor-pointer transition-colors duration-200 flex items-center justify-center gap-2 border border-white/15 text-slate-300 hover:text-white hover:border-white/30 hover:bg-white/5"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M13 15l-5-5 5-5" transform="rotate(180 8 10)" />
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
              Làm lại bài test
            </Link>

            <InvitePrompt
              resultId={resultId}
              personaName={personaName}
              mbtiType={mbtiType}
            />
          </motion.div>
        </div>

        {/* Scroll chevron */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-600"
          animate={{ opacity: rm ? 0.6 : [0, 0.8, 0] }}
          transition={{
            duration: rm ? 0 : 1.5,
            delay: rm ? 0 : 2,
            repeat: rm ? 0 : Infinity,
          }}
          aria-hidden="true"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </motion.div>
      </div>

      {/* Off-screen ShareCard pre-rendered for instant share */}
      <ShareCard ref={shareCardRef} personaName={personaName} mbtiType={mbtiType} insight={insight} />

      {/* Scrollable area below centered reveal */}
      <div className="relative z-10 mt-16 w-full max-w-sm pb-16">
        <VillainsSection villains={villains} />
        <ReverseReveal
          declaredType={declaredType}
          calculatedType={mbtiType}
          personaName={personaName}
        />
        {status && voterCount > 0 && (
          <>
            <GapVisualization
              selfTags={status.selfTags}
              friendTags={status.friendTags}
              hasUnlockedGapReport={status.hasUnlockedGapReport}
              mbtiType={mbtiType}
              onUnlock={unlockGapReport}
            />
            <LoopStatus
              voterCount={voterCount}
              mbtiType={mbtiType}
              onInviteMore={() => {
                document
                  .querySelector<HTMLButtonElement>('[data-testid="test-your-friends-cta"]')
                  ?.click();
              }}
              onUnlock={unlockGapReport}
            />
            <CouplePack resultId={resultId} mbtiType={mbtiType} />
          </>
        )}
      </div>

      {gapSepay && (
        <PaymentQR
          checkout={gapSepay}
          open
          onClose={() => checkout.reset()}
          onCompleted={() => checkout.reset()}
        />
      )}

      {/* Share sheet — Facebook + Copy link of the INVITE url (recipients can
          take the full test; sharing to 2 friends unlocks the Gap Report). */}
      <AnimatePresence>
        {shareOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: rm ? 0 : 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-sheet-title"
          >
            <button
              type="button"
              aria-label="Đóng"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setShareOpen(false)}
            />
            <motion.div
              className="relative w-full max-w-md bg-surface-base border-t border-white/10 rounded-t-2xl px-6 pt-6 pb-8 flex flex-col gap-4"
              initial={{ y: rm ? 0 : '100%' }}
              animate={{ y: 0 }}
              exit={{ y: rm ? 0 : '100%' }}
              transition={{ duration: rm ? 0 : 0.3, ease: 'easeOut' }}
            >
              <div className="flex items-start justify-between">
                <h2 id="share-sheet-title" className="text-[18px] font-semibold text-white">
                  Chia sẻ kết quả
                </h2>
                <button
                  type="button"
                  onClick={() => setShareOpen(false)}
                  className="text-slate-400 hover:text-white p-1 -m-1 cursor-pointer"
                  aria-label="Đóng"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 5l10 10M15 5L5 15" />
                  </svg>
                </button>
              </div>

              <p className="text-[14px] text-slate-300 leading-relaxed">
                Chia sẻ cho <span className="text-white font-medium">2 người bạn</span> qua Facebook
                hoặc copy link — họ làm bài và bạn{' '}
                <span className="text-white font-medium">mở khoá báo cáo miễn phí</span>.
              </p>

              <div
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-[13px] text-slate-200 break-all select-all min-h-[48px] flex items-center"
                data-testid="share-invite-url"
              >
                {generateInvite.isPending ? (
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
                  onClick={handleFacebook}
                  disabled={!inviteUrl || generateInvite.isPending}
                  data-testid="share-facebook-btn"
                  className="flex-1 h-[48px] rounded-xl font-semibold text-[15px] transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-[#1877F2] text-white hover:opacity-90"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6 4.39 10.97 10.13 11.85v-8.38H7.08v-3.47h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.25h3.32l-.53 3.47h-2.79v8.38C19.61 23.04 24 18.07 24 12.07Z" />
                  </svg>
                  Facebook
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={!inviteUrl || generateInvite.isPending}
                  data-testid="share-copy-btn"
                  className="flex-1 h-[48px] rounded-xl font-medium text-[15px] border border-white/15 text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="5" y="5" width="9" height="9" rx="1" />
                    <path d="M3 11V4a1 1 0 0 1 1-1h7" />
                  </svg>
                  Copy link
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownloadCard}
                className="text-[13px] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? 'Đã lưu ảnh kết quả ✓' : 'Hoặc tải ảnh kết quả để đăng story'}
              </button>

              <div role="status" aria-live="polite" className="min-h-[20px] text-[13px] text-center">
                {shareToast && <span className="text-green-400">{shareToast}</span>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
