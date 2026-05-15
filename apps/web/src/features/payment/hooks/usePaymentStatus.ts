import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/api';

type PaymentStatusResponse = {
  data: { status: 'pending' | 'completed' | 'failed' } | null;
  error: { code: string; message: string } | null;
};

// Polls a SePay payment until it leaves `pending`. Caller passes `enabled`
// (only while the QR screen is open).
export function usePaymentStatus(paymentId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['paymentStatus', paymentId],
    queryFn: () => apiCall<PaymentStatusResponse>(`/api/payments/${paymentId}/status`),
    enabled: enabled && !!paymentId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return status && status !== 'pending' ? false : 4000;
    },
    retry: false,
  });
}
