import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiCall } from '@/lib/api';
import { useTestStore } from '../store/useTestStore';
import type { NextQuestionResponse, Question } from '@mbti/shared';

type UseTestFlowResult = {
  currentQuestion: Question | null;
  questionIndex: number;
  isComplete: boolean;
  isLoading: boolean;
  error: Error | null;
  submitAnswer: (questionId: string, value: number) => void;
};

export function useTestFlow(): UseTestFlowResult {
  const answers = useTestStore((s) => s.answers);
  const currentIndex = useTestStore((s) => s.currentIndex);
  const setAnswer = useTestStore((s) => s.setAnswer);
  const setCurrentIndex = useTestStore((s) => s.setCurrentIndex);

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const mutation = useMutation({
    mutationFn: (answerList: typeof answers) =>
      apiCall<NextQuestionResponse>('/api/tests/next-question', {
        method: 'POST',
        body: JSON.stringify({ answers: answerList }),
      }),
    onSuccess: (data) => {
      if (data.data === null) {
        setIsComplete(true);
        setCurrentQuestion(null);
      } else {
        setIsComplete(false);
        setCurrentQuestion(data.data.question);
      }
    },
  });

  // Fetch initial question on mount (supports resume — passes existing answers)
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      mutation.mutate(answers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitAnswer = useCallback(
    (questionId: string, value: number) => {
      setAnswer(questionId, value);
      setCurrentIndex(currentIndex + 1);
      const updatedAnswers = [
        ...answers.filter((a) => a.questionId !== questionId),
        { questionId, value },
      ];
      mutation.mutate(updatedAnswers);
    },
    [answers, currentIndex, setAnswer, setCurrentIndex, mutation],
  );

  return {
    currentQuestion,
    questionIndex: mutation.data?.data?.questionIndex ?? currentIndex,
    isComplete,
    isLoading: mutation.isPending,
    error: mutation.error,
    submitAnswer,
  };
}
