'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Elements } from '@stripe/react-stripe-js';
import { Spin } from 'antd';

import { StandalonePaymentForm } from '@/features/payments/standalone/standalone-payment-form';
import { useSetupIntentQuery, useStripeInstanceQuery } from '@/features/stripe/hooks';
import { buildStripeFormOptions } from '@/features/stripe/payment-elements';

export function StandaloneStripePayment({
  virtualLabId,
  onCancel,
}: {
  virtualLabId: string;
  onCancel: () => void;
}) {
  const setupIntent = useSetupIntentQuery({ virtualLabId });
  const stripe = useStripeInstanceQuery();
  const loadingStripe = setupIntent.isLoading || stripe.isLoading;

  if (loadingStripe) {
    return (
      <div className="flex h-full grow items-center justify-center">
        <Spin size="large" indicator={<LoadingOutlined className="text-white" />} />
      </div>
    );
  }

  if (!stripe.data || !setupIntent.data?.data) {
    return null;
  }

  return (
    <Elements
      stripe={stripe.data}
      options={buildStripeFormOptions(setupIntent.data.data.client_secret)}
    >
      <StandalonePaymentForm virtualLabId={virtualLabId} onCancel={onCancel} />
    </Elements>
  );
}
