import { useMutation } from '@tanstack/react-query';
import { apiCall } from '@/lib/api';
import { safeCapture } from '@/lib/posthog';

type GenerateInviteResponse = {
  data: { inviteUrl: string; token: string; expiredAt: string } | null;
  error: { code: string; message: string } | null;
};

export function useGenerateInvite() {
  return useMutation({
    mutationFn: async (vars: { resultId: string }) => {
      const res = await apiCall<GenerateInviteResponse>('/api/invites/generate', {
        method: 'POST',
        body: JSON.stringify({ resultId: vars.resultId }),
      });
      if (!res.data) {
        throw new Error(res.error?.message ?? 'Failed to generate invite link');
      }
      return res.data;
    },
    onSuccess: (data, vars) => {
      safeCapture('invite_generated', { resultId: vars.resultId, token: data.token });
    },
  });
}
