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

type StripeFormProps = {
  _virtualLabId: string;
  onCancel: () => void;
  onPrevious: () => void;
  onStepChange: (step: SubscriptionFlowSteps) => void;
};

type PaymentFormProps = {
  onCancel: () => void;
  onPrevious: () => void;
  onStepChange: (step: SubscriptionFlowSteps) => void;
  virtualLabId: string;
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

// TODO: implement the payment
export function Form({ _virtualLabId, onCancel, onPrevious, onStepChange }: StripeFormProps) {
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
      onStepChange('members');
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
  virtualLabId,
  onCancel,
  onPrevious,
  onStepChange,
}: PaymentFormProps) {
  const stripeRef = useRef(false);
  const session = useAtomValue(sessionAtom);
  const { error: errorNotify } = useNotification();
  const [stripePromise, setStripePromise] = useState<Stripe | null>(null);
  const [loadingStripe, setLoadingStripe] = useState(false);

  const [{ client_secret: clientSecret, customer_id: customerId }, setStripeSetupObject] = useState<
    SetupIntentResponse['data']
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
            generateSetupIntent(virtualLabId, session.accessToken),
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
          virtualLabId
        );
        setLoadingStripe(false);
      }
    }

    if (virtualLabId && !stripeRef.current) {
      initializeStripe();
      stripeRef.current = true;
    }
  }, [errorNotify, session, virtualLabId]);

  if (loadingStripe)
    return (
      <div className="flex h-full flex-grow items-center justify-center py-7">
        <Spin size="large" indicator={<LoadingOutlined />} />
      </div>
    );

  return (
    <div className="flex h-full flex-grow flex-col">
      <Elements stripe={stripePromise} options={buildStripeFormOptions(clientSecret)}>
        <Form
          {...{
            customerId,
            _virtualLabId: virtualLabId,
            onCancel,
            onPrevious,
            onStepChange,
          }}
        />
      </Elements>
    </div>
  );
}
