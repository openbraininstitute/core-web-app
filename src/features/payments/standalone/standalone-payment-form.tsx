'use client';

import { useElements, useStripe } from '@stripe/react-stripe-js';
import { useQueryClient } from '@tanstack/react-query';
import { NotificationPlacements } from 'antd/es/notification/interface';
import { get } from 'es-toolkit/compat';
import { useSession } from 'next-auth/react';
import { useDeferredValue, useEffect, useMemo, useReducer, useState } from 'react';

import {
  BillingQuoteRequestFlowDict,
  type TBillingAddress,
} from '@/api/virtual-lab-svc/queries/types';
import { useAppNotification } from '@/components/notification';
import { CreditsAmountInput, useCreditConversionQuery } from '@/features/credits';
import { BillingSummary } from '@/features/payments/billing-summary';
import { useBillingQuoteQuery } from '@/features/payments/hooks';
import { useCreateStandalonePaymentMutation } from '@/features/payments/standalone/hooks';
import { StandalonePaymentMethodSection } from '@/features/payments/standalone/payment-method-section';
import {
  confirmStripeSetupPaymentMethod,
  StripeSetupConfirmationError,
} from '@/features/stripe/confirm-setup';
import { formatMinorCurrency } from '@/features/stripe/utils';
import { messages } from '@/i18n/en/payment';
import { keyBuilder as userKeyBuilder } from '@/ui/use-query-keys/user';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { User } from 'next-auth';

const MAX_CONVERSIONS_PER_TRANSACTION = 10;

const notificationConfig = {
  placement: NotificationPlacements[2],
  key: 'standalone-payment-error',
};

export function StandalonePaymentForm({
  virtualLabId,
  onCancel,
}: {
  virtualLabId: string;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const elements = useElements();
  const stripe = useStripe();
  const { data: session } = useSession();
  const { success: successNotify, error: errorNotify } = useAppNotification();
  const createStandalonePayment = useCreateStandalonePaymentMutation();
  const [billingAddress, setBillingAddress] = useState<TBillingAddress | null>(null);
  const [credits, setCredits] = useState<number | undefined>(undefined);
  const [isPaying, setIsPaying] = useState(false);
  const [saveBillingAddressToProfile, setSaveBillingAddressToProfile] = useState<boolean>(false);
  const [stripeElementsReady, setStripeElementsReady] = useState(false);
  const [conversionKeys, addConversionKey] = useReducer((keys: Set<string>, key: string) => {
    if (keys.has(key)) {
      return keys;
    }
    const nextKeys = new Set(keys);
    nextKeys.add(key);
    return nextKeys;
  }, new Set<string>());

  const debouncedCredits = useDeferredValue(credits);
  const conversionKey = debouncedCredits && debouncedCredits > 0 ? `${debouncedCredits}:chf` : null;
  const conversionAllowed =
    Boolean(conversionKey) &&
    (conversionKeys.has(conversionKey as string) ||
      conversionKeys.size < MAX_CONVERSIONS_PER_TRANSACTION);

  useEffect(() => {
    if (conversionKey && conversionAllowed && !conversionKeys.has(conversionKey)) {
      addConversionKey(conversionKey);
    }
  }, [conversionAllowed, conversionKey, conversionKeys]);

  const conversionPayload = debouncedCredits
    ? {
        credits: debouncedCredits,
        currency: 'chf',
      }
    : null;

  const conversion = useCreditConversionQuery({
    payload: conversionPayload,
    enabled: conversionAllowed,
  });

  const quotePayload = useMemo(
    () =>
      billingAddress?.country && debouncedCredits
        ? {
            flow: BillingQuoteRequestFlowDict.Standalone,
            virtual_lab_id: virtualLabId,
            credits: debouncedCredits,
            currency: 'chf',
            billing_address: billingAddress,
          }
        : null,
    [billingAddress, debouncedCredits, virtualLabId]
  );

  const quote = useBillingQuoteQuery({
    payload: quotePayload,
    enabled: Boolean(quotePayload) && conversionAllowed,
  });

  const conversionText = conversion.data
    ? formatMinorCurrency(conversion.data.amount, conversion.data.currency)
    : '0.00 CHF';

  const limitReached = Boolean(conversionKey) && !conversionAllowed;
  const currentBillingAddress = billingAddress?.country ? billingAddress : null;
  const user = session?.user as User;

  const disablePaying =
    !stripe ||
    !stripeElementsReady ||
    !elements ||
    !quote.data ||
    !credits ||
    !currentBillingAddress ||
    !user ||
    quote.isFetching ||
    isPaying;

  const onPay = async () => {
    if (disablePaying) return;
    setIsPaying(true);

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
            ? (error.message ?? messages.paymentProcessingErrorFallback)
            : messages.paymentProcessingErrorFallback;
      errorNotify({
        message: messages.paymentProcessingErrorTitle,
        description,
        ...notificationConfig,
      });
      setIsPaying(false);
      return;
    }

    try {
      const { data } = await createStandalonePayment.mutateAsync({
        quote_id: quote.data.quote_id,
        virtual_lab_id: virtualLabId,
        billing_address: currentBillingAddress,
        sync_billing_address_to_profile: saveBillingAddressToProfile,
        payment_method_id: paymentMethodId,
      });
      if (saveBillingAddressToProfile) {
        void queryClient.invalidateQueries({
          queryKey: userKeyBuilder.profile(),
        });
      }
      successNotify({
        message: messages.paymentSuccess
          .replace('$$credits', credits.toString())
          .replace('$$amount', (data.amount_total / 100).toString())
          .replace('$$currency', data.currency.toUpperCase()),
        ...notificationConfig,
      });
      const accountingKey = keyBuilder.accounting({ virtualLabId });
      onCancel();
      window.setTimeout(() => {
        void queryClient.invalidateQueries({
          queryKey: accountingKey,
        });
      }, 1_000);
      setIsPaying(false);
    } catch (error) {
      const code = get(error, 'cause.code', 'DEFAULT');
      const serverError = get(error, 'cause.message', messages.paymentProcessingError);
      const errors = {
        ENTITY_ALREADY_EXISTS: messages.paymentProcessingErrorEntityAlreadyExists,
        ENTITY_NOT_CREATED: messages.paymentProcessingErrorEntityNotCreated,
        ENTITY_NOT_FOUND: messages.paymentProcessingErrorEntityNotFound,
        PAYMENT_ERROR: serverError,
        DEFAULT: messages.paymentProcessingError,
      };
      const description = get(errors, code, messages.paymentProcessingError);
      errorNotify({
        message: messages.paymentProcessingErrorTitle,
        description,
        ...notificationConfig,
      });
      setIsPaying(false);
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-col gap-4">
      <CreditsAmountInput
        hint={limitReached ? 'Calculation of order full amount limit reached' : conversionText}
        value={credits}
        disabled={isPaying}
        loadingHint={conversion.isFetching}
        onValueChange={setCredits}
      />
      <BillingSummary
        quote={quote.data ?? null}
        conversion={conversion.data ?? null}
        loading={quote.isFetching}
      />
      <StandalonePaymentMethodSection
        billingAddress={billingAddress}
        disabled={isPaying}
        onBillingAddressChange={setBillingAddress}
        onCancel={onCancel}
        onPay={onPay}
        onPaymentReady={() => setStripeElementsReady(true)}
        onSaveBillingAddressChange={setSaveBillingAddressToProfile}
        payDisabled={disablePaying}
        saveBillingAddress={Boolean(saveBillingAddressToProfile)}
        submitting={isPaying}
      />
    </div>
  );
}
