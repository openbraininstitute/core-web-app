'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Elements } from '@stripe/react-stripe-js';
import { Spin } from 'antd';
import { useCallback, useState } from 'react';

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
  const [elementsKey, setElementsKey] = useState(0);
  const {
    data: setupIntentData,
    isLoading: isSetupIntentLoading,
    refetch: refetchSetupIntent,
  } = useSetupIntentQuery({ virtualLabId });
  const stripe = useStripeInstanceQuery();
  const loadingStripe = isSetupIntentLoading || stripe.isLoading;

  const refreshSetupIntent = useCallback(async () => {
    await refetchSetupIntent();
    setElementsKey((currentKey) => currentKey + 1);
  }, [refetchSetupIntent]);

  if (loadingStripe) {
    return (
      <div className="flex min-h-[240px] grow items-center justify-center">
        <Spin size="large" indicator={<LoadingOutlined className="text-white" />} />
      </div>
    );
  }

  if (!stripe.data || !setupIntentData?.data) {
    return null;
  }

  return (
    <Elements
      key={elementsKey}
      stripe={stripe.data}
      options={buildStripeFormOptions(setupIntentData.data.client_secret)}
    >
      <StandalonePaymentForm
        virtualLabId={virtualLabId}
        onCancel={onCancel}
        onSetupIntentRefreshNeeded={refreshSetupIntent}
      />
    </Elements>
  );
}
