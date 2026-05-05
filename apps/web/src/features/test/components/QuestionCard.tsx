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

  // Cleanup timer on unmount to prevent state writes after unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSelect = (value: number) => {
    if (selected !== null) return; // double-tap guard
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
    <div className="flex flex-col min-h-svh bg-[#050507] px-6 py-10">
      {/* 12-dot progress indicator */}
      <div className="flex gap-1.5 justify-center mb-10" role="progressbar" aria-valuemin={1} aria-valuemax={12} aria-valuenow={questionIndex + 1}>
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            aria-label={i === questionIndex ? `Câu ${questionIndex + 1} / 12` : undefined}
            className={cn(
              'w-2 h-2 rounded-full inline-block',
              i === questionIndex ? 'bg-[#818CF8]' : 'bg-white/20',
            )}
          />
        ))}
      </div>

      {/* Question text */}
      <div className="flex-1 flex flex-col justify-center max-w-prose mx-auto w-full gap-8">
        <p className="text-[20px] font-bold text-[#F8F9FC] leading-relaxed text-center">
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
                  'w-full text-left rounded-xl border-2 px-5 py-4',
                  'text-[15px] font-medium leading-relaxed',
                  'transition-opacity bg-white/5',
                  isSelected
                    ? 'border-[#818CF8] ring-2 ring-[#818CF8]/30 text-white'
                    : 'border-white/10 text-slate-300 hover:border-white/30',
                  isDimmed && 'opacity-40',
                )}
                style={
                  isSelected && !rm
                    ? { transitionDuration: '150ms' }
                    : undefined
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
