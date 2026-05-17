import type { MBTIType } from '@mbti/shared';

type Props = {
  selfTags: string[];
  friendTags: string[];
  hasUnlockedGapReport: boolean;
  mbtiType: MBTIType;
  onUnlock: () => void;
};

export function GapVisualization({
  selfTags,
  friendTags,
  hasUnlockedGapReport,
  mbtiType,
  onUnlock,
}: Props) {
  return (
    <section
      aria-labelledby="gap-heading"
      className="mt-12 w-full"
      data-testid="gap-visualization"
    >
      <h2 id="gap-heading" className="text-[18px] font-semibold text-white mb-4">
        Bạn nhìn bạn vs. người khác nhìn bạn
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[var(--hairline)] bg-surface-elevated shadow-[var(--shadow-e1)] p-4">
          <p className="text-[12px] uppercase tracking-[0.2em] text-slate-400 mb-3">
            Bạn thấy bạn
          </p>
          <ul className="flex flex-col gap-2">
            {selfTags.map((t) => (
              <li
                key={t}
                className={`text-[14px] text-white py-1.5 px-3 rounded-md bg-type-${mbtiType}/15 border border-type-${mbtiType}/25 inline-block`}
              >
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`rounded-2xl border border-[var(--hairline)] bg-surface-elevated shadow-[var(--shadow-e1)] p-4 relative ${
            hasUnlockedGapReport ? '' : 'overflow-hidden'
          }`}
        >
          <p className="text-[12px] uppercase tracking-[0.2em] text-slate-400 mb-3">
            Người thân thấy bạn
          </p>
          <ul
            className={`flex flex-col gap-2 ${
              hasUnlockedGapReport ? '' : 'blur-[8px] select-none pointer-events-none'
            }`}
            aria-hidden={!hasUnlockedGapReport}
          >
            {friendTags.map((t) => (
              <li
                key={t}
                className={`text-[14px] text-white py-1.5 px-3 rounded-md bg-type-${mbtiType}/15 border border-type-${mbtiType}/25 inline-block`}
              >
                {t}
              </li>
            ))}
          </ul>
          {!hasUnlockedGapReport && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 backdrop-blur-[2px] px-3 text-center">
              <p className="text-[12px] text-slate-200 leading-snug">
                Mời <span className="text-white font-medium">2 bạn</span> qua Facebook/copy link →{' '}
                <span className="text-white font-medium">miễn phí</span>
              </p>
              <button
                type="button"
                onClick={onUnlock}
                data-testid="gap-unlock-btn"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[13px] font-medium border border-white/20 cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="7" width="10" height="7" rx="1.5" />
                  <path d="M5 7V5a3 3 0 0 1 6 0v2" />
                </svg>
                Hoặc mở khoá 25.000đ
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
