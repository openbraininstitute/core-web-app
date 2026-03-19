'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Spin } from 'antd';
import { isObject } from 'es-toolkit/compat';
import { useState, useTransition } from 'react';
import { match, P } from 'ts-pattern';

import { tryCatch } from '@/api/utils';
import { createStandalonePayment, getSetupIntent } from '@/api/virtual-lab-svc/queries/payment';
import { getVirtualLab, listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';
import { CoinsIcon } from '@/components/icons/buttons';
import { useAppNotification } from '@/components/notification';
import { getStripe } from '@/components/VirtualLab/Billing/utils';
import useUserPermissions from '@/hooks/use-user-permissions';
import { Button, Button as UiButton } from '@/ui/molecules/button';
import { Input } from '@/ui/molecules/input';
import { CONVERSION_RATE } from '@/ui/segments/virtual-lab-settings/elements/helpers';
import {
  PurchaseModeDictionary,
  type TPurchaseModeDictionary,
} from '@/ui/segments/virtual-lab-settings/elements/payment-mode-selection';
import { keyBuilder as externalKeyBuilder } from '@/ui/use-query-keys/third-parties';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import { EmailVerification } from './email-verification';

import type { StripeElementsOptions } from '@stripe/stripe-js';

export const PaymentMode = {
  SetCredits: {
    key: 'set-credits',
    label: 'Set credits',
  },
  Apply: {
    key: 'apply-payment',
    label: 'Apply payment',
  },
} as const;

export const PaymentModeDictionary = Object.fromEntries(
  Object.entries(PaymentMode).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof PaymentMode]: (typeof PaymentMode)[K]['key'];
};

export type TPaymentModeDictionary =
  (typeof PaymentModeDictionary)[keyof typeof PaymentModeDictionary];

const buildStripeFormOptions = (clientSecret: string): StripeElementsOptions => ({
  clientSecret,
  fonts: [
    {
      family: 'Titillium Web',
      cssSrc:
        'https://fonts.googleapis.com/css2?family=Titillium+Web:ital,wght@0,200;0,300;0,400;0,600;0,700;0,900;1,200;1,300;1,400;1,600;1,700&display=swap',
    },
  ],
  appearance: {
    theme: 'stripe', // or 'flat', 'night', etc.
    labels: 'above', // or 'above'
    variables: {
      fontFamily: 'Titillium Web',
      fontSizeSm: '1rem',
      colorPrimary: 'white',
      colorTextPlaceholder: '#fff',
      colorBackground: '#0a3a76',
      colorTextSecondary: 'white',
      colorText: '#333333',
      spacingUnit: '4px',
    },
    rules: {
      'Input:focus': {
        boxShadow:
          '0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 6px rgba(18, 42, 66, 0.02), 0 0 0 2px #0050B3',
        borderColor: 'none',
      },
      'Input::placeholder': {
        color: '#fff',
      },
      '.Input': {
        color: '#fff',
        fontWeight: '700',
      },
      '.Label': {
        color: '#d9d9d9',
        fontSize: '14px',
        fontWeight: '500',
      },
    },
  },
});

function AmountForm({
  credits,
  onCreditsChange,
  formLoading,
  onModeChange,
  onStepChange,
  showControls,
}: {
  credits: number | undefined;
  onCreditsChange: (credits: number | undefined) => void;
  formLoading: boolean;
  onModeChange?: (m: TPurchaseModeDictionary) => void;
  onStepChange?: (s: TPaymentModeDictionary) => void;
  showControls: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#0a3a76] p-4 backdrop-blur-lg px-4">
      <div className="flex w-full flex-col gap-2">
        <div className="relative w-full">
          <Input
            id="amount"
            type="number"
            // min={0}
            defaultValue={undefined}
            value={credits}
            onChange={(e) => onCreditsChange(Number(e.target.value) || undefined)}
            placeholder="0"
            className={cn(
              'h-16 w-full rounded-xl border-white/20 bg-[#052f66] pr-28 text-xl! font-bold text-white placeholder:text-white/50',
              '[appearance:textfield] border px-4 py-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
            )}
            disabled={formLoading}
          />
          <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-lg text-white">
            Credits
          </div>
        </div>

        <div className="flex items-center gap-2 text-white/90">
          <CoinsIcon className="h-5 w-5" />
          <span className="text-lg">
            {credits ? (credits * CONVERSION_RATE).toFixed(2) : '0.00'} CHF
          </span>
        </div>

        {showControls && (
          <>
            <div className="mt-6 flex gap-3">
              <Button
                rounded
                onClick={() => onModeChange?.(PurchaseModeDictionary.Selection)}
                variant="outline"
                className="h-12 flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                rounded
                onClick={() => onStepChange?.(PaymentModeDictionary.Apply)}
                disabled={!credits || credits <= 0}
                className={cn(
                  'h-12 flex-1 bg-white text-base font-semibold',
                  'text-blue-900 hover:bg-white/90 disabled:opacity-50'
                )}
              >
                Continue to Payment
              </Button>
            </div>
            <p className="text-center text-sm text-white/60">Secure payment powered by Stripe</p>
          </>
        )}
      </div>
    </div>
  );
}

function PaymentForm({
  virtualLabId,
  credits,
  onCancel,
  onCreditsChange,
}: {
  virtualLabId: string;
  credits: number;
  onCancel: () => void;
  onCreditsChange: (credits: number | undefined) => void;
}) {
  const queryClient = useQueryClient();
  const elements = useElements();
  const stripe = useStripe();
  const [stripeElementsReady, setElementsReady] = useState(false);
  const { success: successNotify, error: errorNotify } = useAppNotification();
  const [formLoading, startTransition] = useTransition();
  const formLoaded = stripe && elements;
  const disableForm = !formLoaded || formLoading || credits === 0;

  const onReady = () => setElementsReady(true);

  const onSubmit = async () => {
    if (!stripe || !elements) {
      return null;
    }

    const addCredits = async () => {
      const { setupIntent, error } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: window.location.href,
        },
      });
      if (error) {
        errorNotify({
          message:
            error.message ||
            "We couldn't process your payment. Please check your card details and try again.",
          placement: 'topRight',
          key: 'subscription-payment-error',
        });

        throw new Error(error.message);
      }
      if (setupIntent?.status === 'succeeded' && setupIntent.payment_method && credits > 0) {
        const amountInCents = parseFloat(Number(credits * CONVERSION_RATE * 100).toFixed(2));
        return await createStandalonePayment({
          amount: amountInCents,
          currency: 'chf',
          virtual_lab_id: virtualLabId,
          payment_method_id:
            typeof setupIntent.payment_method === 'string'
              ? setupIntent.payment_method
              : setupIntent.payment_method?.id,
        });
      }
      errorNotify({
        message:
          "Your payment couldn't be completed. Please try again or use a different payment method.",
        placement: 'topRight',
        key: 'subscription-payment-error',
      });
      throw new Error('Payment setup was not completed successfully');
    };

    startTransition(async () => {
      const { data, error } = await tryCatch(addCredits(), () => {
        elements.getElement('payment')?.clear();
      });

      if (data) {
        successNotify({
          message: `Successfully purchased ${credits} credits for ${data.amount / 100} ${data.currency.toUpperCase()}`,
          placement: 'topRight',
          key: 'credits-purchase-success',
        });
        await queryClient.invalidateQueries({ queryKey: keyBuilder.accounting({ virtualLabId }) });
        onCancel();
      }

      if (error) {
        let message =
          'There was a problem processing your payment. Please try again or contact support if the issue persists.';
        if (isObject(error.cause) && 'error_code' in error.cause) {
          if (error.cause.error_code === 'ENTITY_ALREADY_EXISTS') {
            message = 'This payment has already been processed';
          }
          if (error.cause.error_code === 'ENTITY_NOT_CREATED') {
            message =
              "We couldn't process your payment at this time. Please try again or contact our support team for help.";
          }
          if (error.cause.error_code === 'ENTITY_NOT_FOUND') {
            message =
              "We couldn't find your payment details. Please try again or contact support if the issue persists.";
          }
        }
        errorNotify({
          message,
          placement: 'topRight',
          key: 'subscription-payment-error',
        });
      }
    });
  };

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <AmountForm {...{ credits, onCreditsChange, formLoading, showControls: false }} />
      <div className="rounded-2xl border border-white/10 bg-[#0a3a76] p-5 text-white mb-5">
        <PaymentElement
          id="credits-form"
          onReady={onReady}
          options={{ layout: { type: 'auto' } }}
        />
      </div>
      {stripeElementsReady && (
        <div className="ml-auto flex items-center justify-end gap-4">
          <UiButton
            rounded
            type="button"
            variant="ghost"
            size="lg"
            className="hover:border-primary-4! w-max border border-none text-white shadow-2xl hover:border"
            onClick={onCancel}
          >
            Cancel
          </UiButton>
          <UiButton
            rounded
            type="button"
            variant="default"
            size="lg"
            className={cn(
              'border-primary-4! w-max border shadow-2xl',
              'hover:bg-primary-8/40',
              'hover:shadow-[1px_2px_4px_0px_#00000099]',
              'shadow-[8px_12px_24px_0px_#00000099]',
              'shadow-[-8px_-8px_42px_0px_#FFFFFF29]'
            )}
            disabled={disableForm}
            onClick={onSubmit}
          >
            <div className="flex w-24 items-center justify-center">
              Pay
              {formLoading && <LoadingOutlined spin className="ml-2 text-white" />}
            </div>
          </UiButton>
        </div>
      )}
    </div>
  );
}

function StripePayment({
  virtualLabId,
  credits,
  onCreditsChange,
  onModeChange,
}: {
  virtualLabId: string;
  credits: number;
  onCreditsChange: (credits: number | undefined) => void;
  onModeChange: (m: TPurchaseModeDictionary) => void;
}) {
  const [
    { data: setupIntent, isLoading: loadingIntent },
    { data: stripe, isLoading: loadingStripeInstance },
  ] = useQueries({
    queries: [
      {
        queryKey: externalKeyBuilder.stripeSetupIntent({ virtualLabId }),
        queryFn: getSetupIntent,
        staleTime: 0,
        gcTime: 0,
      },
      {
        queryKey: externalKeyBuilder.stripeInstance(),
        queryFn: getStripe,
      },
    ],
  });
  const loadingStripe = loadingIntent || loadingStripeInstance;

  if (loadingStripe) {
    return (
      <div className="flex h-full grow items-center justify-center">
        <Spin size="large" indicator={<LoadingOutlined className="text-white" />} />
      </div>
    );
  }
  if (!stripe || !setupIntent?.data) {
    return null;
  }

  return (
    <Elements stripe={stripe} options={buildStripeFormOptions(setupIntent.data?.client_secret)}>
      <PaymentForm
        virtualLabId={virtualLabId}
        credits={credits}
        onCancel={() => onModeChange(PurchaseModeDictionary.Selection)}
        onCreditsChange={onCreditsChange}
      />
    </Elements>
  );
}

export function StripePaymentFlow({
  virtualLabId,
  onModeChange,
}: {
  virtualLabId: string;
  onModeChange: (m: TPurchaseModeDictionary) => void;
}) {
  const [step, setStep] = useState<TPaymentModeDictionary>(PaymentModeDictionary.SetCredits);
  const [credits, setCredits] = useState<number | undefined>(undefined);
  const onCreditsChange = (c: number | undefined) => {
    if (c === undefined || c <= 0) {
      setStep(PaymentModeDictionary.SetCredits);
    }
    setCredits(c);
  };
  const { data: virtualLabData, isLoading } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab(virtualLabId),
    enabled: Boolean(virtualLabId),
  });
  const { isVirtualLabAdmin } = useUserPermissions({ virtualLabId, projectId: undefined });

  const onStepChange = (s: TPaymentModeDictionary) => setStep(s);

  // the user is allowed to update the virtual lab reference email
  // only if the user is an admin
  if (!isLoading && !virtualLabData?.data?.virtual_lab.email_verified && isVirtualLabAdmin) {
    return <EmailVerification virtualLabId={virtualLabId} />;
  }

  const content = match({ mode: step, credits })
    .with({ mode: PaymentModeDictionary.SetCredits }, () => (
      <AmountForm
        showControls
        {...{
          credits,
          onCreditsChange: setCredits,
          formLoading: false,
          onModeChange,
          onStepChange,
        }}
      />
    ))
    .with({ mode: PaymentModeDictionary.Apply, credits: P.not(P.nullish.select()) }, (value) => (
      <StripePayment
        virtualLabId={virtualLabId}
        credits={value.credits}
        onCreditsChange={onCreditsChange}
        onModeChange={onModeChange}
      />
    ))
    .otherwise(() => null);

  return content;
}
