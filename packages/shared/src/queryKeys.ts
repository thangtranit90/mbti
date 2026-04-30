import type { MBTIType } from './constants';

export const queryKeys = {
  testResult: (id: string) => ['testResult', id] as const,
  socialStatus: (userId: string) => ['socialStatus', userId] as const,
  feed: (mbtiType: MBTIType) => ['feed', mbtiType] as const,
};
