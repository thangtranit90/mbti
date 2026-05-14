import type { MBTIType } from '@mbti/shared';

type Props = {
  voterCount: number;
  mbtiType: MBTIType;
  onInviteMore: () => void;
  onUnlock: () => void;
};

const TARGET = 3;

export function LoopStatus({ voterCount, mbtiType, onInviteMore, onUnlock }: Props) {
  const displayCount = Math.min(voterCount, TARGET);
  const progressPct = (displayCount / TARGET) * 100;

  return (
    <section
      aria-labelledby="loop-status-heading"
      className="mt-8 w-full"
      data-testid="loop-status"
    >
      <h2 id="loop-status-heading" className="sr-only">
        Trạng thái vòng lặp xã hội
      </h2>

      <div
        role="status"
        aria-live="polite"
        aria-label={`${displayCount} of ${TARGET} friends have responded`}
        className="text-[14px] text-slate-300 mb-2"
      >
        <span className={`font-semibold text-type-${mbtiType}`}>{displayCount}/{TARGET}</span>{' '}
        người đã vote
      </div>

      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-4">
        <div
          className={`h-full bg-type-${mbtiType} transition-all duration-500`}
          style={{ width: `${progressPct}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onInviteMore}
          className="flex-1 h-[44px] rounded-xl border border-white/15 text-slate-200 hover:text-white hover:bg-white/5 cursor-pointer text-[14px] font-medium"
          data-testid="invite-more-btn"
        >
          Mời thêm người
        </button>
        <button
          type="button"
          onClick={onUnlock}
          className={`flex-1 h-[44px] rounded-xl bg-type-${mbtiType} text-white hover:opacity-90 cursor-pointer text-[14px] font-semibold`}
          data-testid="unlock-now-btn"
        >
          Mở khóa ngay
        </button>
      </div>
    </section>
  );
}
