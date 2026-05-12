import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useTestStore } from '../store/useTestStore';
import { useTestFlow } from '../hooks/useTestFlow';
import { QuestionCard } from './QuestionCard';
import { EarnedPauseTransition } from './EarnedPauseTransition';
import { safeCapture } from '@/lib/posthog';

function QuestionSkeleton() {
  return (
    <div className="flex flex-col min-h-svh bg-surface-deep px-6 py-10" aria-label="Đang tải câu hỏi">
      <div className="flex gap-1.5 justify-center mb-10">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="w-2 h-2 rounded-full bg-white/10" />
        ))}
      </div>
      <div className="flex-1 flex flex-col justify-center max-w-prose mx-auto w-full gap-8">
        <div className="space-y-3">
          <div className="h-5 bg-white/8 rounded-lg w-full animate-pulse" style={{ animationDuration: '1.5s' }} />
          <div className="h-5 bg-white/8 rounded-lg w-4/5 mx-auto animate-pulse" style={{ animationDuration: '1.5s', animationDelay: '75ms' }} />
          <div className="h-5 bg-white/8 rounded-lg w-3/5 mx-auto animate-pulse" style={{ animationDuration: '1.5s', animationDelay: '150ms' }} />
        </div>
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[60px] rounded-xl bg-white/5 border-2 border-white/5 animate-pulse"
              style={{ animationDuration: '1.5s', animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TestFlow() {
  const navigate = useNavigate();
  const currentIndex = useTestStore((s) => s.currentIndex);
  const { currentQuestion, questionIndex, isComplete, isLoading, error, submitAnswer } =
    useTestFlow();

  useEffect(() => {
    if (currentIndex === 0) {
      safeCapture('test_started');
    }
    // Only fire on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isComplete) {
    return <EarnedPauseTransition onComplete={() => navigate('/test/submit')} />;
  }

  if (error) {
    return (
      <main id="main" className="min-h-svh bg-surface-deep flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="10" cy="10" r="8" />
              <path d="M10 6v4M10 14h.01" />
            </svg>
          </div>
          <p className="text-slate-300 text-[16px] mb-6">Có lỗi xảy ra. Vui lòng thử lại.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-cta-primary hover:bg-cta-hover text-white font-medium text-[15px] cursor-pointer transition-colors duration-200"
          >
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isLoading || !currentQuestion ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <QuestionSkeleton />
        </motion.div>
      ) : (
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <QuestionCard
            question={currentQuestion}
            questionIndex={questionIndex}
            onAnswer={(questionId, value) => {
              safeCapture('test_question_answered', {
                questionIndex,
                dimension: currentQuestion.dimension,
              });
              submitAnswer(questionId, value);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
