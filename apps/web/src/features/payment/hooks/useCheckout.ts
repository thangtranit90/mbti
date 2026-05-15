import { useMutation } from '@tanstack/react-query';
import { apiCall } from '@/lib/api';
import { safeCapture } from '@/lib/posthog';
import type { ProductType } from '@mbti/shared';

export type SePayCheckoutData = {
  gateway: 'sepay';
  paymentId: string;
  qrUrl: string;
  transferContent: string;
  amount: number;
  bankAccount: string;
  bankName: string;
};

export type StripeCheckoutData = {
  gateway: 'stripe';
  paymentId: string;
  checkoutUrl: string;
};

type CheckoutResponse = {
  data: SePayCheckoutData | StripeCheckoutData | null;
  error: { code: string; message: string } | null;
};

// Returns checkout data. Stripe is redirected immediately; SePay data is
// returned so the caller can render the VietQR screen.
export function useCheckout() {
  return useMutation({
    mutationFn: async (vars: { productType: ProductType; resultId: string }) => {
      const res = await apiCall<CheckoutResponse>('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({ productType: vars.productType, resultId: vars.resultId }),
      });
      if (!res.data) {
        throw new Error(res.error?.message ?? 'Checkout failed');
      }
      return res.data;
    },
    onSuccess: (data, vars) => {
      safeCapture('payment_initiated_client', {
        productType: vars.productType,
        resultId: vars.resultId,
        gateway: data.gateway,
      });
      if (data.gateway === 'stripe') {
        window.location.assign(data.checkoutUrl);
      }
    },
  });
}
