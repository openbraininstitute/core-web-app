import { LoadingOutlined } from '@ant-design/icons';
import { Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { useQueryClient } from '@tanstack/react-query';
import { Spin } from 'antd';
import { NotificationPlacements } from 'antd/es/notification/interface';
import { get } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';

import {
  BillingQuoteRequestFlowDict,
  SubscriptionStatus,
} from '@/api/virtual-lab-svc/queries/types';
import { useAppNotification } from '@/components/notification';
import { BillingSummary } from '@/features/payments/billing-summary';
import { useBillingQuoteQuery } from '@/features/payments/hooks';
import PricingToggleCards from '@/features/payments/subscription/pricing-toggle-cards';
import { DefaultCurrency, flowAtom } from '@/features/payments/subscription/shared';
import {
  confirmStripeSetupPaymentMethod,
  StripeSetupConfirmationError,
} from '@/features/stripe/confirm-setup';
import { useSetupIntentQuery, useStripeInstanceQuery } from '@/features/stripe/hooks';
import {
  BillingAddressElement,
  BillingCardElement,
  buildStripeFormOptions,
} from '@/features/stripe/payment-elements';
import { messages } from '@/i18n/en/payment';
import useWorkspace from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { keyBuilder } from '@/ui/use-query-keys/user';
import { cn } from '@/utils/css-class';

import { useCreateSubscriptionMutation } from './hooks';

import type {
  CreditConversionResponse,
  TBillingAddress,
} from '@/api/virtual-lab-svc/queries/types';

type Props = {
  onPrevious: () => void;
};

const notificationConfig = {
  placement: NotificationPlacements[2],
  key: 'subscription-payment-error',
};

function Form({ onPrevious }: Props) {
  const { virtualLabId } = useWorkspace();
  const queryClient = useQueryClient();
  const elements = useElements();
  const stripe = useStripe();
  const { data: session } = useSession();
  const { interval, tier } = useAtomValue(flowAtom);
  const [billingAddress, setBillingAddress] = useState<TBillingAddress | null>(null);
  const [stripeElementsReady, setElementsReady] = useState(false);
  const [isSubscribing, setSubscribing] = useState(false);
  const [saveBillingAddressToProfile, setSaveBillingAddressToProfile] = useState<boolean>(false);
  const { success: successNotify, error: errorNotify } = useAppNotification();
  const createSubscription = useCreateSubscriptionMutation();

  const quotePayload = useMemo(
    () =>
      billingAddress && tier?.app_id && virtualLabId
        ? {
            interval,
            virtual_lab_id: virtualLabId,
            flow: BillingQuoteRequestFlowDict.Subscription,
            tier_id: tier.app_id,
            currency: DefaultCurrency,
            billing_address: billingAddress,
          }
        : null,
    [billingAddress, interval, virtualLabId, tier]
  );

  const quote = useBillingQuoteQuery({
    payload: quotePayload,
    enabled: Boolean(quotePayload),
  });

  const selectedPrice = useMemo(
    () => tier?.prices.find((price) => price.interval === interval),
    [interval, tier?.prices]
  );

  const billingSummaryFallback: CreditConversionResponse | null = selectedPrice
    ? {
        credits: 0,
        currency: selectedPrice.currency,
        amount: selectedPrice.discount || selectedPrice.amount,
        rate: 0,
      }
    : null;

  const formLoaded = stripe && elements;
  const disableForm =
    !formLoaded || !stripeElementsReady || isSubscribing || quote.isFetching || !quote.data;

  const user = session?.user;
  const currentBillingAddress = billingAddress?.country ? billingAddress : null;

  const disablePaying =
    !stripe ||
    !stripeElementsReady ||
    !elements ||
    !quote.data ||
    !currentBillingAddress ||
    !user ||
    !tier?.app_id ||
    quote.isFetching ||
    isSubscribing;

  const onSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disablePaying) {
      return;
    }
    setSubscribing(true);

    let paymentMethodId: string;
    try {
      paymentMethodId = await confirmStripeSetupPaymentMethod({
        billingAddress: currentBillingAddress,
        elements,
        returnUrl: window.location.href,
        stripe,
        user,
      });
    } catch (error) {
      const description =
        error instanceof StripeSetupConfirmationError && error.reason === 'missing_payment_method'
          ? messages.paymentMethodSaveError
          : error instanceof Error
            ? (error.message ?? messages.paymentProcessingError)
            : messages.paymentProcessingError;
      errorNotify({
        message: messages.paymentProcessingErrorTitle,
        description,
        ...notificationConfig,
      });
      setSubscribing(false);
      return;
    }

    try {
      const { data } = await createSubscription.mutateAsync({
        interval,
        tier_id: tier.app_id,
        quote_id: quote.data.quote_id,
        billing_address: currentBillingAddress,
        sync_billing_address_to_profile: saveBillingAddressToProfile,
        payment_method_id: paymentMethodId,
      });
      if (saveBillingAddressToProfile) {
        void queryClient.invalidateQueries({
          queryKey: keyBuilder.profile(),
        });
      }
      if (data?.subscription.status === SubscriptionStatus.ACTIVE) {
        successNotify({
          message: messages.subscriptionPaymentSuccess,
          description: messages.subscriptionPaymentSuccessDescription,
          ...notificationConfig,
        });
      }
      setSubscribing(false);
    } catch (error) {
      const code = get(error, 'cause.code', 'DEFAULT');
      const serverError = get(error, 'cause.message', messages.paymentProcessingError);
      const errors = {
        ENTITY_ALREADY_EXISTS: messages.subscriptionPaymentErrorEntityAlreadyExists,
        ENTITY_NOT_CREATED: messages.subscriptionPaymentErrorEntityNotCreated,
        ENTITY_NOT_FOUND: messages.subscriptionPaymentErrorEntityNotFound,
        PAYMENT_ERROR: serverError,
        DEFAULT: messages.paymentProcessingError,
      };
      const description = get(errors, code, messages.paymentProcessingError);
      errorNotify({
        message: messages.paymentProcessingErrorTitle,
        description,
        ...notificationConfig,
      });
      setSubscribing(false);
    }
  };

  return (
    <form
      data-testid="subscription-payment-from"
      name="stripe-payment-flow-step"
      className="mx-auto flex h-full min-h-0 w-full flex-col overflow-y-auto secondary-scrollbar px-4 py-6"
      onSubmit={onSubmit}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <PricingToggleCards />
        <BillingSummary
          quote={quote.data ?? null}
          conversion={billingSummaryFallback}
          loading={quote.isFetching}
        />
        <div className="rounded-2xl border border-gray-200 bg-white/5 p-4 text-primary-9">
          <div className="mb-4 font-semibold">Payment method</div>
          <div className="flex flex-col gap-4">
            <BillingAddressElement
              address={billingAddress}
              disabled={isSubscribing}
              framed={false}
              onAddressChange={setBillingAddress}
              onSaveAddressChange={(checked) => setSaveBillingAddressToProfile(Boolean(checked))}
              saveAddress={saveBillingAddressToProfile}
            />
            <BillingCardElement
              disabled={isSubscribing}
              framed={false}
              onReady={() => setElementsReady(true)}
              paymentElementId="subscription-form"
            />
          </div>
          <div className="mt-5 flex items-center justify-end gap-3">
            <Button
              rounded
              type="button"
              variant="ghost"
              size="lg"
              className={cn(
                'w-max border border-none text-primary-9',
                'shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)]',
                'hover:bg-gray-100'
              )}
              disabled={isSubscribing}
              onClick={onPrevious}
            >
              Cancel
            </Button>
            <Button
              rounded
              type="submit"
              variant="default"
              size="lg"
              className={cn('w-max border border-none shadow-2xl text-white', 'hover:bg-primary-8')}
              disabled={disableForm}
            >
              <div className="flex items-center gap-2 px-6">
                Pay
                {isSubscribing && <LoadingOutlined spin />}
              </div>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function PaymentForm({ onPrevious }: Props) {
  const { step } = useAtomValue(flowAtom);
  const setupIntent = useSetupIntentQuery({
    enabled: step === 'pay',
    virtualLabId: 'subscription',
  });
  const stripe = useStripeInstanceQuery({ enabled: step === 'pay' });

  if (setupIntent.isLoading || stripe.isLoading) {
    return (
      <div className="flex h-full grow items-center justify-center py-7">
        <Spin size="large" indicator={<LoadingOutlined className="text-white" />} />
      </div>
    );
  }

  if (!setupIntent.data?.data?.client_secret || !stripe.data) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 grow flex-col">
      <Elements
        stripe={stripe.data}
        options={buildStripeFormOptions(setupIntent.data.data.client_secret)}
      >
        <Form onPrevious={onPrevious} />
      </Elements>
    </div>
  );
}
