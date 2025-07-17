import { PaymentElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { FormEvent, useState, useEffect, useRef, useTransition } from 'react';
import { Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { LoadingOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import { Button, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import isObject from 'lodash/isObject';
import delay from 'lodash/delay';

import getStripe from '@/components/VirtualLab/Billing/utils';
import sessionAtom from '@/state/session';

import PricingToggleCards from '@/components/VirtualLab/create-entity-flows/checkout/price-card';
import { flowAtom } from '@/components/VirtualLab/create-entity-flows/checkout/shared';
import { getSetupIntent } from '@/api/virtual-lab-svc/queries/payment';
import { useAppNotification } from '@/components/notification';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';
import { createSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { SetupIntentResponse, SubscriptionStatus } from '@/api/virtual-lab-svc/queries/types';

type Props = {
  onPrevious: () => void;
  successRedirectUrl?: string;
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
    variables: {
      fontFamily: 'Titillium Web',
      fontSizeSm: '1rem',
    },
    rules: {
      '.Input:focus': {
        boxShadow:
          '0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 6px rgba(18, 42, 66, 0.02), 0 0 0 2px #0050B3',
        borderColor: 'none',
      },
    },
  },
});

function Form({ onPrevious, successRedirectUrl }: Props) {
  const elements = useElements();
  const stripe = useStripe();
  const { interval, tier } = useAtomValue(flowAtom);
  const { push: navigate } = useRouter();
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
      const { data, error } = await tryCatch(paySubscription(), () => {
        elements.getElement('payment')?.clear();
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
        errorNotify({ message, placement: 'topRight', key: 'subscription-payment-error' });
      }
      if (data && data.subscription.status === SubscriptionStatus.ACTIVE) {
        successNotify({
          message: 'Subscription created successfully',
          placement: 'topRight',
          key: 'subscription-payment-success',
        });
        delay(() => navigate(successRedirectUrl ?? '/app/virtual-lab/account/invoices'), 2000);
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
        <div className="mx-auto flex w-full flex-col rounded-lg bg-white px-5 py-14">
          <div className="mx-auto w-full max-w-xl">
            <PaymentElement id="subscription-form" onReady={onReady} />
          </div>
        </div>
      </div>

      {stripeElementsReady && (
        <div className="mt-auto flex w-full items-end justify-end gap-3">
          <Button
            key="back-to-btn"
            className={classNames(
              'h-14 rounded-none px-6 text-white',
              'hover:border! hover:border-white! hover:font-bold hover:text-white!'
            )}
            type="text"
            size="large"
            htmlType="button"
            onClick={onPrevious}
          >
            Back
          </Button>
          <Button
            key="pay-subscription"
            className={classNames(
              'bg-primary-9 h-14 rounded-none border border-white px-14 text-white',
              'hover:border-primary-8! hover:bg-primary-8 hover:border! hover:font-bold hover:text-white! hover:shadow-xs',
              'disabled:border-gray-400 disabled:bg-white! disabled:text-gray-700! disabled:hover:text-gray-700!',
              'disabled:hover:border-gray-400! disabled:hover:bg-white! disabled:hover:text-gray-700!'
            )}
            type="default"
            size="large"
            htmlType="submit"
            disabled={disableForm}
            loading={formLoading}
          >
            Pay
          </Button>
        </div>
      )}
    </form>
  );
}

export default function PaymentForm({ onPrevious, successRedirectUrl }: Props) {
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
      } catch (error) {
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
        <Spin size="large" indicator={<LoadingOutlined />} />
      </div>
    );

  return (
    <div className="flex h-full grow flex-col">
      <Elements stripe={stripePromise} options={buildStripeFormOptions(setupIntent?.client_secret)}>
        <Form onPrevious={onPrevious} successRedirectUrl={successRedirectUrl} />
      </Elements>
    </div>
  );
}
