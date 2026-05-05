import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useTestStore } from '../store/useTestStore';
import { useTestFlow } from '../hooks/useTestFlow';
import { QuestionCard } from './QuestionCard';
import { EarnedPauseTransition } from './EarnedPauseTransition';
import { safeCapture } from '@/lib/posthog';

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
      <div className="min-h-svh bg-[#050507] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-slate-300 text-[16px] mb-6">
            Có lỗi xảy ra. Vui lòng thử lại.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-[#818CF8] text-white font-medium text-[15px]"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isLoading || !currentQuestion ? (
        <motion.div
          key="loading"
          className="min-h-svh bg-[#050507]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        />
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
