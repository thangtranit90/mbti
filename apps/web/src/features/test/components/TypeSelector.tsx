import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { MBTIType } from '@mbti/shared';
import { cn } from '@/lib/utils';
import { safeCapture } from '@/lib/posthog';
import { useTestStore } from '../store/useTestStore';
import { TYPE_GROUPS, TYPE_META, type GroupKey } from '../data/typeGroups';
import { AiDisclaimer } from './AiDisclaimer';

// Tailwind v4 safelist — these utilities are interpolated dynamically per type
// code in Phase 2. Keep this comment-block in sync with MBTI_TYPES so the JIT
// scanner emits the matching CSS rules. Edit this list whenever an MBTIType is
// added or removed.
//
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
// ring-type-INTJ ring-type-INTP ring-type-ENTJ ring-type-ENTP
// ring-type-INFJ ring-type-INFP ring-type-ENFJ ring-type-ENFP
// ring-type-ISTJ ring-type-ISFJ ring-type-ESTJ ring-type-ESFJ
// ring-type-ISTP ring-type-ISFP ring-type-ESTP ring-type-ESFP

const HEADLINE = 'Trước khi bắt đầu — bạn hay bị nhận xét là người như thế nào?';
const SUBCOPY = 'Không cần chắc chắn. Kết quả sẽ cho bạn thấy mình đoán đúng hay sai.';
const SKIP_COPY = 'Tôi không chắc — bỏ qua bước này →';
const CONFIRM_DELAY_MS = 450;

export function TypeSelector() {
  const navigate = useNavigate();
  const setDeclaredType = useTestStore((s) => s.setDeclaredType);
  const reduceMotion = useReducedMotion() ?? false;

  const [phase, setPhase] = useState<'group' | 'type'>('group');
  const [selectedGroup, setSelectedGroup] = useState<GroupKey | null>(null);
  const [selectedType, setSelectedType] = useState<MBTIType | null>(null);

  const navigateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    safeCapture('declare_screen_viewed');
  }, []);

  useEffect(
    () => () => {
      if (navigateTimerRef.current !== null) {
        window.clearTimeout(navigateTimerRef.current);
      }
    },
    [],
  );

  const handleGroupTap = (key: GroupKey) => {
    safeCapture('declare_group_selected', { groupKey: key });
    setSelectedGroup(key);
    setPhase('type');
  };

  const handleBack = () => {
    if (navigateTimerRef.current !== null) {
      window.clearTimeout(navigateTimerRef.current);
      navigateTimerRef.current = null;
    }
    setSelectedType(null);
    setPhase('group');
    setSelectedGroup(null);
  };

  const handleSkip = () => {
    safeCapture('declare_skipped');
    setDeclaredType(null);
    navigate('/test');
  };

  const handleTypeTap = (code: MBTIType) => {
    if (selectedType !== null) return;
    setSelectedType(code);
    safeCapture('declare_type_selected', { declaredType: code });
    const delay = reduceMotion ? 0 : CONFIRM_DELAY_MS;
    navigateTimerRef.current = window.setTimeout(() => {
      setDeclaredType(code);
      navigate('/test');
    }, delay);
  };

  const activeGroup =
    selectedGroup !== null ? TYPE_GROUPS.find((g) => g.key === selectedGroup) : null;

  return (
    <div className="min-h-svh flex items-center justify-center px-6 py-[60px] bg-surface-deep">
      <div className="w-full max-w-[480px]">
        <AiDisclaimer />

        <div className="mt-8 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {phase === 'group' && (
              <motion.div
                key="phase-1"
                initial={reduceMotion ? false : { x: '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { x: '-100%', opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
              >
                <h1 className="text-[22px] font-semibold text-white leading-tight">
                  {HEADLINE}
                </h1>
                <p className="text-[14px] text-slate-400 mt-2 mb-6">{SUBCOPY}</p>

                <div
                  role="radiogroup"
                  aria-label="Nhóm tính cách"
                  className="space-y-2"
                >
                  {TYPE_GROUPS.map((group) => (
                    <button
                      key={group.key}
                      type="button"
                      role="radio"
                      aria-checked={false}
                      aria-label={`${group.name} — ${group.descriptor}`}
                      onClick={() => handleGroupTap(group.key)}
                      className={cn(
                        'w-full text-left rounded-lg border border-white/10 bg-surface-elevated',
                        'px-4 py-4 min-h-[80px] flex flex-col gap-1',
                        'transition-colors hover:bg-white/5 active:bg-white/10',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                      )}
                    >
                      <span className="text-[18px] font-semibold text-white">{group.name}</span>
                      <span className="text-[14px] text-slate-400">{group.descriptor}</span>
                      <span className="text-[12px] text-slate-600 tracking-[0.08em] mt-1">
                        {group.types.join(' · ')}
                      </span>
                    </button>
                  ))}
                </div>

              </motion.div>
            )}

            {phase === 'type' && activeGroup && (
              <motion.div
                key="phase-2"
                initial={reduceMotion ? false : { x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { x: '100%', opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
              >
                <div className="flex items-center justify-between h-14 mb-2">
                  <button
                    type="button"
                    aria-label="Quay lại nhóm"
                    onClick={handleBack}
                    disabled={selectedType !== null}
                    className={cn(
                      'w-11 h-11 flex items-center justify-center text-white text-xl',
                      'rounded hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                      'disabled:opacity-40',
                    )}
                  >
                    ←
                  </button>
                  <span className="text-[16px] font-medium text-white">{activeGroup.name}</span>
                  <div className="flex gap-1.5" aria-hidden="true">
                    {TYPE_GROUPS.map((g) => (
                      <span
                        key={g.key}
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          g.key === activeGroup.key ? 'bg-white/80' : 'bg-white/20',
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div
                  role="radiogroup"
                  aria-label={`Loại tính cách trong nhóm ${activeGroup.name}`}
                  className="grid grid-cols-2 gap-3 mt-2"
                >
                  {activeGroup.types.map((code) => {
                    const meta = TYPE_META[code];
                    const isSelected = selectedType === code;
                    const dim = selectedType !== null && !isSelected;
                    return (
                      <motion.button
                        key={code}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${meta.vietnameseName} — ${meta.code}: ${meta.recognition}`}
                        onClick={() => handleTypeTap(code)}
                        disabled={selectedType !== null && !isSelected}
                        animate={
                          isSelected && !reduceMotion ? { scale: [1, 1.05, 1] } : { scale: 1 }
                        }
                        transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeInOut' }}
                        className={cn(
                          'flex flex-col gap-2 rounded-lg border-2 p-4 text-left min-h-[120px]',
                          'transition-opacity duration-150',
                          'bg-surface-elevated',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                          dim && 'opacity-40',
                          isSelected
                            ? `border-type-${code} ring-2 ring-type-${code}/30`
                            : 'border-white/10',
                        )}
                      >
                        <span
                          className={cn(
                            'text-[14px] tracking-[0.1em] font-medium',
                            `text-type-${code}`,
                          )}
                        >
                          {meta.code}
                        </span>
                        <span className="text-[16px] font-semibold text-white">
                          {meta.vietnameseName}
                        </span>
                        <span
                          aria-hidden="true"
                          className={cn('block h-px w-full', `bg-type-${code}`)}
                        />
                        <span className="text-[13px] text-slate-400 leading-relaxed">
                          {meta.recognition}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {phase === 'group' && (
          <button
            type="button"
            onClick={handleSkip}
            className={cn(
              'block mx-auto mt-6 text-[14px] text-slate-500 underline underline-offset-4',
              'hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded',
              'sticky bottom-6',
            )}
          >
            {SKIP_COPY}
          </button>
        )}
      </div>
    </div>
  );
}
