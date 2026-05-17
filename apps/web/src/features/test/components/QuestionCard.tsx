import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Question } from '@mbti/shared';

type Props = {
  question: Question;
  questionIndex: number;
  onAnswer: (questionId: string, value: number) => void;
};

export function QuestionCard({ question, questionIndex, onAnswer }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rm = useReducedMotion() ?? false;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSelect = (value: number) => {
    if (selected !== null) return;
    setSelected(value);
    const delay = rm ? 0 : 300;
    timerRef.current = setTimeout(() => {
      onAnswer(question.id, value);
    }, delay);
  };

  const handleKeyDown = (e: React.KeyboardEvent, value: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(value);
    }
  };

  return (
    <main id="main" className="flex flex-col min-h-svh bg-surface-deep px-6 py-10">
      {/* Progress indicator */}
      <div
        className="flex gap-1.5 justify-center mb-10"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={12}
        aria-valuenow={questionIndex + 1}
        aria-label={`Câu ${questionIndex + 1} trên 12`}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            aria-label={i === questionIndex ? `Câu ${questionIndex + 1} / 12` : undefined}
            className={cn(
              'h-1.5 rounded-full inline-block transition-all duration-[var(--dur-base)]',
              i === questionIndex
                ? 'w-6 bg-cta-primary'
                : i < questionIndex
                  ? 'w-1.5 bg-cta-primary/55'
                  : 'w-1.5 bg-white/15',
            )}
          />
        ))}
      </div>

      {/* Question text */}
      <div className="flex-1 flex flex-col justify-center max-w-prose mx-auto w-full gap-9">
        <p className="font-clash text-[24px] sm:text-[26px] font-semibold text-white leading-snug text-center text-balance tracking-[-0.01em]">
          {question.text}
        </p>

        {/* Answer options */}
        <div role="radiogroup" aria-label="Lựa chọn câu trả lời" className="flex flex-col gap-3">
          {question.options.map((option) => {
            const isSelected = selected === option.value;
            const isDimmed = selected !== null && !isSelected;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={selected !== null}
                onClick={() => handleSelect(option.value)}
                onKeyDown={(e) => handleKeyDown(e, option.value)}
                className={cn(
                  'w-full text-left rounded-2xl border-2 px-5 py-4 cursor-pointer',
                  'text-[15px] font-medium leading-relaxed bg-surface-elevated shadow-[var(--shadow-e1)]',
                  'transition-[transform,border-color,background-color,box-shadow,opacity] duration-[var(--dur-fast)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-deep',
                  'disabled:cursor-not-allowed',
                  isSelected
                    ? 'border-cta-primary ring-2 ring-cta-primary/40 text-white bg-cta-primary/10 shadow-[var(--shadow-e2)]'
                    : 'border-[var(--hairline)] text-slate-200 hover:border-[var(--hairline-strong)] hover:-translate-y-[1px] active:translate-y-0',
                  isDimmed && 'opacity-40',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
