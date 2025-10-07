'use client';

import { PaymentElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { ArrowLeftOutlined, LoadingOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef, useTransition } from 'react';
import { Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { useQueryClient } from '@tanstack/react-query';
import { match, P } from 'ts-pattern';
import { Spin } from 'antd';

import isObject from 'es-toolkit/compat/isObject';

import { createStandalonePayment, getSetupIntent } from '@/api/virtual-lab-svc/queries/payment';
import { SetupIntentResponse } from '@/api/virtual-lab-svc/queries/types';
import { getStripe } from '@/components/VirtualLab/Billing/utils';
import { useAppNotification } from '@/components/notification';
import { Button as UiButton } from '@/ui/molecules/button';
import { CoinsIcon } from '@/components/icons/buttons';
import { Input } from '@/ui/molecules/input';
import { cn } from '@/utils/css-class';
import { tryCatch } from '@/api/utils';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

type BuyCreditsStepProps = {
  virtualLabId: string;
  onBack: () => void;
};

const PaymentStep = {
  Amount: 'amount',
  Payment: 'payment',
} as const;

type TPaymentStep = (typeof PaymentStep)[keyof typeof PaymentStep];

const CONVERSION_RATE = 0.5; // CHF per credit

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
    labels: 'floating', // or 'inline'
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

function PaymentForm({
  virtualLabId,
  credits,
  onBack,
  onCreditsChange,
}: {
  virtualLabId: string;
  credits: number;
  onBack: () => void;
  onCreditsChange: (credits: number) => void;
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
        onBack();
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
    <div className="flex h-full w-full flex-col gap-6">
      <AmountInput {...{ credits, onCreditsChange, formLoading }} />
      <div className="rounded-2xl border border-white/10 bg-[#0a3a76] p-5 text-white">
        <div className="mb-3 p-2 text-lg font-semibold select-none">Payment Details</div>
        <div className="rounded-lg bg-[#0a3a76] p-2">
          <PaymentElement id="credits-form" onReady={onReady} />
        </div>
      </div>

      {stripeElementsReady && (
        <div className="mt-auto ml-auto flex items-center justify-end gap-4">
          <UiButton
            rounded
            type="button"
            variant="ghost"
            size="lg"
            className="hover:border-primary-4! w-max border border-none text-white shadow-2xl hover:border"
            onClick={onBack}
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

function AmountInput({
  credits,
  onCreditsChange,
  formLoading,
}: {
  credits: number | undefined;
  onCreditsChange: (credits: number) => void;
  formLoading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a3a76] p-5 text-white">
      <div className="mx-auto max-w-max">
        <div className="mb-3 text-lg font-semibold">Amount</div>
        <div className="relative w-full max-w-md">
          <Input
            id="amount"
            type="number"
            min={0}
            value={credits}
            onChange={(e) => onCreditsChange(Number(e.target.value) || 0)}
            placeholder="0"
            className={cn(
              'h-16 rounded-xl border-white/20 bg-[#052f66] pr-28 text-xl! font-bold text-white placeholder:text-white/50',
              '[appearance:textfield] border px-4 py-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
            )}
            disabled={formLoading}
          />
          <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-lg text-white">
            Credits
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-white/70">
          <CoinsIcon />
          <span className="font-bold text-white">
            <span className="font-light!"> Total:</span>{' '}
            {credits ? (credits * CONVERSION_RATE).toFixed(2) : '0.00'} CHF
          </span>
        </div>
      </div>
    </div>
  );
}

export function BuyCreditsStep({ onBack, virtualLabId }: BuyCreditsStepProps) {
  const [step, setStep] = useState<TPaymentStep>('amount');
  const [credits, setCredits] = useState<number | undefined>(undefined);
  const [stripePromise, setStripePromise] = useState<Stripe | null>(null);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [setupIntent, setStripeSetupObject] = useState<SetupIntentResponse['data'] | null>(null);
  const stripeRef = useRef(false);
  const { error: errorNotify } = useAppNotification();

  useEffect(() => {
    async function initializeStripe() {
      try {
        setLoadingStripe(true);
        const [stripeSetup, stripeObject] = await Promise.all([getSetupIntent(), getStripe()]);
        setStripePromise(stripeObject);
        setStripeSetupObject(stripeSetup.data);
        setLoadingStripe(false);
      } catch (error) {
        errorNotify({
          message:
            "We're having some trouble setting up your payment options at the moment. Please try again in a little while.",
          placement: 'topRight',
        });
        setLoadingStripe(false);
      }
    }

    if (!stripeRef.current && step === PaymentStep.Payment) {
      initializeStripe();
      stripeRef.current = true;
    }
  }, [errorNotify, step]);

  const handlePaymentClick = () => {
    if (credits && credits > 0) {
      setStep(PaymentStep.Payment);
    }
  };

  const handleBackToAmount = () => {
    if (step === PaymentStep.Payment) {
      setStep(PaymentStep.Amount);
    } else {
      onBack();
    }
  };

  const handleBackToMain = () => {
    setStep(PaymentStep.Amount);
    setCredits(undefined);
    onBack();
  };

  const content = match({ step, loadingStripe, setupIntent, credits })
    .with({ step: PaymentStep.Amount }, () => (
      <div id="buy-credits-amount-input" className="relative flex h-full flex-col gap-6 pb-10">
        <AmountInput {...{ credits, onCreditsChange: setCredits, formLoading: false }} />
        <div className="mx-auto mt-auto flex w-full justify-end gap-4 self-end px-3">
          <UiButton
            rounded
            type="button"
            variant="ghost"
            size="lg"
            className="hover:border-primary-4! w-max border border-none text-white shadow-2xl hover:border"
            onClick={onBack}
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
            disabled={!credits}
            onClick={handlePaymentClick}
          >
            Continue to Payment
          </UiButton>
        </div>
      </div>
    ))
    .with({ step: PaymentStep.Payment, loadingStripe: true, setupIntent: P.nullish }, () => {
      return (
        <div className="flex h-full grow items-center justify-center">
          <Spin size="large" indicator={<LoadingOutlined className="text-white" />} />
        </div>
      );
    })
    .with(
      {
        step: PaymentStep.Payment,
        loadingStripe: P.not(true),
        setupIntent: P.not(P.nullish).select('intent'),
        credits: P.not(P.nullish).select('fcredits'),
      },
      ({ intent, fcredits }) => {
        return (
          <Elements stripe={stripePromise} options={buildStripeFormOptions(intent.client_secret)}>
            <PaymentForm
              virtualLabId={virtualLabId}
              credits={fcredits}
              onBack={handleBackToMain}
              onCreditsChange={setCredits}
            />
          </Elements>
        );
      }
    )
    .otherwise(() => null);

  return (
    <div className="relative mb-10 flex h-full flex-col">
      <div
        id="buy-credits-header"
        className="bg-primary-9 sticky top-0 z-10 flex shrink-0 items-center px-6 py-5"
      >
        <div className="flex w-full items-center gap-4">
          <UiButton
            rounded
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBackToAmount}
            className="hover:bg-neutral-2/20 h-auto !px-4 py-2! text-white hover:text-white"
          >
            <ArrowLeftOutlined className="text-lg" />
            <span className="ml-4 text-lg font-bold text-white select-none">Credits</span>
          </UiButton>
        </div>
      </div>
      <div id="buy-credits-content" className="mx-auto h-full w-full max-w-3xl px-3">
        {content}
      </div>
    </div>
  );
}
