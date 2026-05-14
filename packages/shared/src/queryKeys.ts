import type { MBTIType } from './constants';

export const queryKeys = {
  session: () => ['session'] as const,
  testResult: (id: string) => ['testResult', id] as const,
  socialStatus: () => ['socialStatus'] as const,
  feed: (mbtiType: MBTIType) => ['feed', mbtiType] as const,
  nextQuestion: (answeredIds: string[]) => ['nextQuestion', answeredIds] as const,
  resultInsight: (resultId: string) => ['resultInsight', resultId] as const,
  insightGenerate: (resultId: string) => ['insightGenerate', resultId] as const,
};
