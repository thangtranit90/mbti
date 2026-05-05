import type { MBTIType } from './constants';

export const queryKeys = {
  session: () => ['session'] as const,
  testResult: (id: string) => ['testResult', id] as const,
  socialStatus: (userId: string) => ['socialStatus', userId] as const,
  feed: (mbtiType: MBTIType) => ['feed', mbtiType] as const,
  nextQuestion: (answeredIds: string[]) => ['nextQuestion', answeredIds] as const,
};
