import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@mbti/shared';
import { apiCall } from '@/lib/api';

export type SocialStatusResponse = {
  data: {
    voterCount: number;
    latestVoterName: string | null;
    latestVotes: Array<{ id: string; createdAt: string }>;
    hasUnlockedGapReport: boolean;
    selfTags: string[];
    friendTags: string[];
  } | null;
  error: { code: string; message: string } | null;
};

const THREE_MINUTES = 3 * 60 * 1000;

export function useSocialStatus(enabled = true) {
  return useQuery({
    queryKey: queryKeys.socialStatus(),
    queryFn: () => apiCall<SocialStatusResponse>('/api/social/status'),
    refetchInterval: THREE_MINUTES,
    refetchOnWindowFocus: true,
    retry: false,
    enabled,
  });
}
