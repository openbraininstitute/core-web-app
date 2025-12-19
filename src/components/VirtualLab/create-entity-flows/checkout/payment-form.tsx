import { LoadingOutlined } from '@ant-design/icons';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { useQueryClient } from '@tanstack/react-query';
import { Spin } from 'antd';
import isObject from 'es-toolkit/compat/isObject';
import { useAtomValue } from 'jotai';
import { type FormEvent, useEffect, useRef, useState, useTransition } from 'react';
import { tryCatch } from '@/api/utils';
import { getSetupIntent } from '@/api/virtual-lab-svc/queries/payment';
import { createSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { type SetupIntentResponse, SubscriptionStatus } from '@/api/virtual-lab-svc/queries/types';
import { useAppNotification } from '@/components/notification';
import { getStripe } from '@/components/VirtualLab/Billing/utils';
import PricingToggleCards from '@/components/VirtualLab/create-entity-flows/checkout/price-card';
import { flowAtom } from '@/components/VirtualLab/create-entity-flows/checkout/shared';
import sessionAtom from '@/state/session';
import { Button } from '@/ui/molecules/button';
import { makeTriggerWorkspaceConfigurationClickEvent } from '@/ui/segments/workspaces/space-manager/event';
import { keyBuilder } from '@/ui/use-query-keys/user';
import { cn } from '@/utils/css-class';

type Props = {
  onPrevious: () => void;
};

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

function Form({ onPrevious }: Props) {
  const queryClient = useQueryClient();
  const elements = useElements();
  const stripe = useStripe();
  const { interval, tier } = useAtomValue(flowAtom);
  const [stripeElementsReady, setElementsReady] = useState(false);
  const { success: successNotify, error: errorNotify } = useAppNotification();
  const [formLoading, startTransition] = useTransition();

  const formLoaded = stripe && elements;
  const disableForm = !formLoaded || formLoading;

  const onReady = () => setElementsReady(true);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!stripe || !elements) {
      return null;
    }

    const paySubscription = async () => {
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
      }
      if (setupIntent?.status === 'succeeded' && setupIntent.payment_method && tier?.app_id) {
        return await createSubscription({
          interval,
          tier_id: tier?.app_id,
          payment_method_id:
            typeof setupIntent.payment_method === 'string'
              ? setupIntent.payment_method
              : setupIntent.payment_method?.id,
        });
      }
    };

    startTransition(async () => {
      const { data, error } = await tryCatch(paySubscription(), async () => {
        elements.getElement('payment')?.clear();
        await queryClient.invalidateQueries({
          queryKey: keyBuilder.subscription(),
        });
      });

      if (error) {
        let message =
          'There was a problem processing your payment. Please try again or contact support if the issue persists.';
        if (isObject(error.cause) && 'error_code' in error.cause) {
          if (error.cause.error_code === 'ENTITY_ALREADY_EXISTS') {
            message = 'You already have an active subscription';
          }
          if (error.cause.error_code === 'ENTITY_NOT_CREATED') {
            message =
              "We couldn't set up your subscription at this time. Please try again or contact our support team for help.";
          }
          if (error.cause.error_code === 'ENTITY_NOT_FOUND') {
            message =
              "We couldn't find your subscription details. Please try again or contact support if the issue persists.";
          }
        }
        errorNotify({
          message,
          placement: 'topRight',
          key: 'subscription-payment-error',
        });
      }
      if (data && data.subscription.status === SubscriptionStatus.ACTIVE) {
        successNotify({
          message: 'Subscription created successfully',
          description: 'You now have full access to the platform',
          placement: 'topRight',
          key: 'subscription-payment-success',
        });
        makeTriggerWorkspaceConfigurationClickEvent<null>({
          on: false,
          data: null,
          type: null,
        });
      }
    });
  };

  return (
    <form
      data-testid="subscription-payment-from"
      name="stripe-payment-flow-step"
      className="mx-auto flex h-full w-full grow flex-col items-center justify-center"
      onSubmit={onSubmit}
    >
      <div className="flex h-full w-full max-w-3xl grow flex-col items-center justify-center">
        <PricingToggleCards />
        <div className="bg-primary-9 mx-auto flex w-full flex-col rounded-lg py-4">
          <div className="mx-auto w-full">
            <PaymentElement id="subscription-form" onReady={onReady} />
          </div>
        </div>
      </div>

      {stripeElementsReady && (
        <div className="mx-auto mt-auto flex w-full max-w-3xl items-end justify-end gap-3">
          <Button
            rounded
            type="button"
            variant="ghost"
            size="lg"
            className="hover:border-primary-4! w-max border border-none text-white shadow-2xl hover:border"
            disabled={disableForm}
            onClick={onPrevious}
          >
            Cancel
          </Button>
          <Button
            rounded
            type="submit"
            variant="default"
            size="lg"
            className={cn(
              'border-primary-4! w-max border shadow-2xl',
              'hover:bg-primary-8/40',
              'hover:shadow-[1px_2px_4px_0px_#00000099]',
              'shadow-[8px_12px_24px_0px_#00000099]',
              'shadow-[-8px_-8px_42px_0px_#FFFFFF29]',
            )}
            disabled={disableForm}
          >
            <div className="flex items-center gap-2 px-6">
              Pay
              {formLoading && <LoadingOutlined spin />}
            </div>
          </Button>
        </div>
      )}
    </form>
  );
}

export default function PaymentForm({ onPrevious }: Props) {
  const stripeRef = useRef(false);
  const session = useAtomValue(sessionAtom);
  const { step } = useAtomValue(flowAtom);
  const { error: errorNotify } = useAppNotification();
  const [stripePromise, setStripePromise] = useState<Stripe | null>(null);
  const [loadingStripe, setLoadingStripe] = useState(false);

  const [setupIntent, setStripeSetupObject] = useState<SetupIntentResponse['data'] | null>({
    id: '',
    client_secret: '',
    customer_id: '',
  });

  useEffect(() => {
    async function initializeStripe() {
      try {
        setLoadingStripe(true);
        if (session) {
          const [stripeSetup, stripeObject] = await Promise.all([getSetupIntent(), getStripe()]);
          setStripePromise(stripeObject);
          setStripeSetupObject(stripeSetup.data);
          setLoadingStripe(false);
        }
      } catch (_error) {
        errorNotify({
          message:
            "We're having some trouble setting up your payment options at the moment. Please try again in a little while.",
          placement: 'topRight',
          key: 'setup-payment-options',
        });
        setLoadingStripe(false);
      }
    }

    if (!stripeRef.current && step === 'pay') {
      initializeStripe();
      stripeRef.current = true;
    }
  }, [errorNotify, session, step]);

  if (loadingStripe || !setupIntent)
    return (
      <div className="flex h-full grow items-center justify-center py-7">
        <Spin size="large" indicator={<LoadingOutlined className="text-white" />} />
      </div>
    );

  return (
    <div className="flex h-full grow flex-col">
      <Elements stripe={stripePromise} options={buildStripeFormOptions(setupIntent?.client_secret)}>
        <Form onPrevious={onPrevious} />
      </Elements>
    </div>
  );
}
