import { useMutation } from '@tanstack/react-query';
import { apiCall } from '@/lib/api';
import { safeCapture } from '@/lib/posthog';
import type { ProductType } from '@mbti/shared';

type CheckoutResponse = {
  data: { checkoutUrl: string } | null;
  error: { code: string; message: string } | null;
};

export function useCheckout() {
  return useMutation({
    mutationFn: async (vars: { productType: ProductType; resultId: string }) => {
      const res = await apiCall<CheckoutResponse>('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({ productType: vars.productType, resultId: vars.resultId }),
      });
      if (!res.data?.checkoutUrl) {
        throw new Error(res.error?.message ?? 'Checkout failed');
      }
      return res.data.checkoutUrl;
    },
    onSuccess: (checkoutUrl, vars) => {
      safeCapture('payment_initiated_client', {
        productType: vars.productType,
        resultId: vars.resultId,
      });
      window.location.assign(checkoutUrl);
    },
  });
}
