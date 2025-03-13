import { PaymentElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { useState, useEffect, useRef, useTransition } from 'react';
import { Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { LoadingOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import { Button, Spin } from 'antd';
import isObject from 'lodash/isObject';
import delay from 'lodash/delay';

import getStripe from '@/components/VirtualLab/Billing/utils';
import useNotification from '@/hooks/notifications';
import sessionAtom from '@/state/session';

import {
  CreditConverter,
  creditAtom,
} from '@/components/VirtualLab/create-entity-flows/subscription/standalone-credits/credit-converter';
import Modal from '@/components/VirtualLab/create-entity-flows/common/modal';

import { createStandalonePayment, getSetupIntent } from '@/api/virtual-lab-svc/queries/payment';
import { SetupIntentResponse } from '@/services/virtual-lab/billing';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';

const CONVERSION_RATE = 0.02;

type Props = {
  isOpen: boolean;
  onClose: () => void;
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

function Form({ onClose }: { onClose: () => void }) {
  const elements = useElements();
  const stripe = useStripe();
  const [stripeElementsReady, setElementsReady] = useState(false);
  const { success: successNotify, error: errorNotify } = useNotification();
  const [formLoading, startTransition] = useTransition();
  const { credits } = useAtomValue(creditAtom);

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
        errorNotify(
          error.message ||
            "We couldn't process your payment. Please check your card details and try again.",
          undefined,
          'topRight',
          true,
          'subscription-payment-error'
        );
        throw new Error(error.message);
      }
      if (setupIntent?.status === 'succeeded' && setupIntent.payment_method && credits > 0) {
        const amountInCents = Math.round(credits * CONVERSION_RATE * 100);
        return await createStandalonePayment({
          amount: amountInCents,
          currency: 'chf',
          payment_method_id:
            typeof setupIntent.payment_method === 'string'
              ? setupIntent.payment_method
              : setupIntent.payment_method?.id,
        });
      }
      errorNotify(
        "Your payment couldn't be completed. Please try again or use a different payment method.",
        undefined,
        'topRight',
        true,
        'subscription-payment-error'
      );
      throw new Error('Payment setup was not completed successfully');
    };

    startTransition(async () => {
      const { data, error } = await tryCatch(addCredits(), () => {
        elements.getElement('payment')?.clear();
      });

      if (data) {
        successNotify(
          `Successfully purchased ${credits} credits for ${data.amount} ${data.currency.toUpperCase()}`,
          undefined,
          'topRight',
          true,
          'credits-purchase-success'
        );
        onClose();
        delay(() => window.location.reload(), 2000);
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
        errorNotify(message, undefined, 'topRight', true, 'subscription-payment-error');
      }
    });
  };

  return (
    <div
      data-testid="stripe-payment-form"
      className="mx-auto flex h-full w-full flex-grow flex-col items-center justify-center"
    >
      <div className="flex h-full w-full flex-grow flex-col items-center justify-center">
        <CreditConverter showActions={false} />
        <div className="mx-auto  flex w-full flex-col rounded-lg bg-white">
          <PaymentElement id="credits-form" onReady={onReady} />
        </div>
      </div>

      {stripeElementsReady && (
        <div className="mt-8 flex w-full items-center justify-center gap-3">
          <div className="flex items-center justify-center gap-2">
            <Button
              key="cancel-btn"
              className={classNames(
                'rounded-md bg-white px-6 text-primary-8',
                'hover:!border hover:border-primary-8 hover:!bg-white hover:font-bold hover:!text-primary-8'
              )}
              type="text"
              size="large"
              htmlType="button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              key="add-credits-btn"
              className={classNames(
                'rounded-md border-gray-300 bg-white px-6 text-primary-8',
                'hover:!border hover:border-primary-8 hover:!bg-white hover:font-bold hover:!text-primary-8'
              )}
              type="text"
              size="large"
              htmlType="button"
              disabled={disableForm}
              loading={formLoading}
              onClick={onSubmit}
            >
              Pay
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentForm({ isOpen, onClose }: Props) {
  const stripeRef = useRef(false);
  const session = useAtomValue(sessionAtom);
  const { step } = useAtomValue(creditAtom);
  const { error: errorNotify } = useNotification();
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
        errorNotify(
          "We're having some trouble setting up your payment options at the moment. Please try again in a little while.",
          undefined,
          'topRight',
          true
        );
        setLoadingStripe(false);
      }
    }

    if (!stripeRef.current && isOpen) {
      initializeStripe();
      stripeRef.current = true;
    }
  }, [errorNotify, session, isOpen]);

  if (loadingStripe || !setupIntent)
    return (
      <Modal isOpen={isOpen} onClose={onClose} footer={null}>
        <div className="flex h-full flex-grow items-center justify-center py-7">
          <Spin size="large" indicator={<LoadingOutlined />} />
        </div>
      </Modal>
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      footer={null}
      cls={{
        parent: '!w-[550px]',
        content: classNames(
          '!rounded-md',
          step === 'overview' && '!min-h-[8rem]',
          step === 'pay' && '!min-h-[16rem]'
        ),
      }}
    >
      {step === 'overview' && <CreditConverter showActions />}
      {step === 'pay' && (
        <Elements
          stripe={stripePromise}
          options={buildStripeFormOptions(setupIntent?.client_secret)}
        >
          <Form onClose={onClose} />
        </Elements>
      )}
    </Modal>
  );
}
