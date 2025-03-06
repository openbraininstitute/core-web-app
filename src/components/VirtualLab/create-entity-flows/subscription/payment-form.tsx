import { PaymentElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { FormEvent, useState, useEffect, useRef, ChangeEvent } from 'react';
import { Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { LoadingOutlined } from '@ant-design/icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { Spin } from 'antd';
import z from 'zod';

import PricingToggleCards from '@/components/VirtualLab/create-entity-flows/subscription/plans/price-card';
import StripeInput from '@/components/VirtualLab/Billing/StripeInput';
import getStripe from '@/components/VirtualLab/Billing/utils';
import useNotification from '@/hooks/notifications';
import sessionAtom from '@/state/session';

import { SetupIntentResponse, generateSetupIntent } from '@/services/virtual-lab/billing';
import { PaymentFooter } from '@/components/VirtualLab/create-entity-flows/subscription/footer';
import { subscriptionFlowState } from '@/components/VirtualLab/create-entity-flows/subscription/flow-state';
import { type SubscriptionFlowSteps } from '@/components/VirtualLab/create-entity-flows/common/types';
import { getSetupIntent } from '@/api/virtual-lab-svc/queries/subscription';

type StripeFormProps = {
  onCancel: () => void;
  onPrevious: () => void;
  onStepChange: (step: SubscriptionFlowSteps) => void;
};

type PaymentFormProps = {
  onCancel: () => void;
  onPrevious: () => void;
  onStepChange: (step: SubscriptionFlowSteps) => void;
};

const cardholderName = z.object({
  name: z
    .string({ message: 'Cardholder name is required' })
    .min(2, { message: 'Cardholder name must be at least 2 characters long' }),
});

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


export function Form({ onCancel, onPrevious, onStepChange }: StripeFormProps) {
  const elements = useElements();
  const stripe = useStripe();
  const [stripeElementsReady, setElementsReady] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [name, setName] = useState<string>('');
  const [nameError, setNameError] = useState<string | null>(null);
  const setFlowState = useSetAtom(subscriptionFlowState);
  const formLoaded = stripe && elements;
  const disableForm = !formLoaded || formLoading;

  const onNameChange = (e: ChangeEvent<HTMLInputElement>) => setName(e.target.value);
  const onNameBlur = async () => {
    const { error } = await cardholderName.safeParseAsync({ name });
    if (error) setNameError(error.flatten().fieldErrors.name?.join('\n') ?? null);
    else setNameError(null);
  };

  const onReady = () => setElementsReady(true);

  const onPaymentMethodSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!stripe || !elements) {
      return null;
    }

    try {
      setFormLoading(true);
      // const formData = new FormData(event.currentTarget);
      // const data = Object.fromEntries(formData.entries());
      await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: window.location.href,
        },
      });
      const subscription = undefined;
      setFlowState((prev) => ({
        ...prev,
        subscription,
      }));
    } catch (error) {
      // TODO: handle error properly
      throw new Error('error paying');
    } finally {
      elements.getElement('payment')?.clear();
      setFormLoading(false);
    }
  };

  return (
    <form
      name="stripe-payment-flow-step"
      className="mx-auto flex h-full w-full flex-grow flex-col"
      onSubmit={onPaymentMethodSubmit}
    >
      <div className="mx-auto flex h-full w-full max-w-2xl flex-grow flex-col">
        <PricingToggleCards />
        {stripeElementsReady && (
          <div className="w-full">
            <StripeInput
              id="name"
              type="text"
              name="name"
              title="Cardholder name"
              value={name}
              error={nameError}
              onChange={onNameChange}
              onBlur={onNameBlur}
            />
          </div>
        )}
        <PaymentElement onReady={onReady} />
      </div>
      {stripeElementsReady && (
        <PaymentFooter
          disabled={disableForm}
          loading={formLoading}
          onPreviousStep={onPrevious}
          onCancel={onCancel}
        />
      )}
    </form>
  );
}

export default function PaymentForm({
  onCancel,
  onPrevious,
  onStepChange,
}: PaymentFormProps) {
  const stripeRef = useRef(false);
  const session = useAtomValue(sessionAtom);
  const { error: errorNotify } = useNotification();
  const [stripePromise, setStripePromise] = useState<Stripe | null>(null);
  const [loadingStripe, setLoadingStripe] = useState(false);

  const [setupIntent, setStripeSetupObject] = useState<
    SetupIntentResponse['data'] | null
  >({
    id: '',
    client_secret: '',
    customer_id: '',
  });

  useEffect(() => {
    async function initializeStripe() {
      try {
        setLoadingStripe(true);
        if (session) {
          const [stripeSetup, stripeObject] = await Promise.all([
            getSetupIntent(),
            getStripe(),
          ]);
          setStripePromise(stripeObject);
          setStripeSetupObject(stripeSetup.data);
          setLoadingStripe(false);
        }
      } catch (error) {
        errorNotify(
          "We're having some trouble setting up your payment options at the moment. Please try again in a little while.",
          undefined,
          'topRight',
          true,
        );
        setLoadingStripe(false);
      }
    }

    if (!stripeRef.current) {
      initializeStripe();
      stripeRef.current = true;
    }
  }, [errorNotify, session]);

  if (loadingStripe || !setupIntent)
    return (
      <div className="flex h-full flex-grow items-center justify-center py-7">
        <Spin size="large" indicator={<LoadingOutlined />} />
      </div>
    );

  return (
    <div className="flex h-full flex-grow flex-col">
      <Elements stripe={stripePromise} options={buildStripeFormOptions(setupIntent?.client_secret)}>
        <Form
          {...{
            customerId: setupIntent.customer_id,
            onCancel,
            onPrevious,
            onStepChange,
          }}
        />
      </Elements>
    </div>
  );
}
