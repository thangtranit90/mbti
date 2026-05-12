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

import { useState } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import type { MBTIType } from '@mbti/shared';

type Props = {
  personaName: string;
  mbtiType: MBTIType;
};

export function PersonaReveal({ personaName, mbtiType }: Props) {
  const rm = useReducedMotion() ?? false;
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: `Tôi là ${personaName} (${mbtiType})`,
      text: `Kết quả MBTI của tôi: ${personaName} — ${mbtiType}. Làm bài test để khám phá kiểu tính cách của bạn!`,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled or API unavailable — silent fail
    }
  };

  return (
    <main
      id="main"
      className="min-h-svh bg-surface-base flex flex-col items-center justify-center px-6 relative overflow-hidden"
    >
      {/* Type-specific radial glow */}
      <div
        className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-25 bg-type-${mbtiType}`}
        aria-hidden="true"
      />
      <div
        className={`absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10 bg-type-${mbtiType}`}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center text-center gap-4 max-w-sm w-full">
        {/* Persona name */}
        <motion.h1
          className={`font-clash text-[56px] leading-tight text-type-${mbtiType}`}
          style={{ fontSize: 'clamp(2.5rem, 10vw, 4rem)' }}
          initial={{ opacity: rm ? 1 : 0, y: rm ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: rm ? 0 : 0.6, delay: 0 }}
        >
          {personaName}
        </motion.h1>

        {/* Divider */}
        <motion.hr
          className={`border-type-${mbtiType} w-16 border-t`}
          initial={{ opacity: rm ? 1 : 0, scaleX: rm ? 1 : 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: rm ? 0 : 0.4, delay: rm ? 0 : 0.8 }}
          aria-hidden="true"
        />

        {/* Type code */}
        <motion.p
          className={`text-[14px] tracking-[0.3em] uppercase text-type-${mbtiType}`}
          initial={{ opacity: rm ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: rm ? 0 : 0.3, delay: rm ? 0 : 1.0 }}
        >
          {mbtiType}
        </motion.p>

        {/* Actions */}
        <motion.div
          className="flex flex-col gap-3 w-full mt-6"
          initial={{ opacity: rm ? 1 : 0, y: rm ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: rm ? 0 : 0.4, delay: rm ? 0 : 1.4 }}
        >
          <button
            type="button"
            onClick={handleShare}
            aria-live="polite"
            className={`w-full h-[52px] rounded-xl font-semibold text-[15px] cursor-pointer transition-colors duration-200 flex items-center justify-center gap-2 bg-type-${mbtiType} text-white hover:opacity-90 active:opacity-80`}
          >
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="2,8 6,12 14,4" />
                </svg>
                Đã sao chép liên kết!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="13" cy="3" r="1.5" />
                  <circle cx="3" cy="8" r="1.5" />
                  <circle cx="13" cy="13" r="1.5" />
                  <path d="M4.5 8.5l7-4M4.5 8l7 4" />
                </svg>
                Chia sẻ kết quả
              </>
            )}
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
    </main>
  );
}
