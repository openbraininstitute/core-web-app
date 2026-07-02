'use client';

import { useElements, useStripe } from '@stripe/react-stripe-js';
import { useQueryClient } from '@tanstack/react-query';
import { get } from 'es-toolkit/compat';
import { useSession } from 'next-auth/react';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import {
  BillingQuoteRequestFlowDict,
  type TBillingAddress,
} from '@/api/virtual-lab-svc/queries/types';
import { notify } from '@/components/notification';
import { CreditsAmountInput, useCreditConversionQuery } from '@/features/credits';
import { BillingSummary } from '@/features/payments/billing-summary';
import { useBillingQuoteQuery } from '@/features/payments/hooks';
import { useCreateStandalonePaymentMutation } from '@/features/payments/standalone/hooks';
import { StandalonePaymentMethodSection } from '@/features/payments/standalone/payment-method-section';
import {
  getBackendPaymentErrorDescription,
  getStripeSetupErrorDescription,
  isSetupIntentConsumedError,
} from '@/features/stripe/errors';
import { resolvePaymentMethodId } from '@/features/stripe/hooks';
import { formatMinorCurrency } from '@/features/stripe/utils';
import { messages } from '@/i18n/en/payment';
import { keyBuilder as userKeyBuilder } from '@/ui/use-query-keys/user';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { StripePaymentElementChangeEvent } from '@stripe/stripe-js';
import type { User } from 'next-auth';

const MAX_CONVERSIONS_PER_TRANSACTION = 10;

const notificationConfig = {
  key: 'standalone-payment-error',
};

export function StandalonePaymentForm({
  virtualLabId,
  onCancel,
  onSetupIntentRefreshNeeded,
}: {
  virtualLabId: string;
  onCancel: () => void;
  onSetupIntentRefreshNeeded: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const elements = useElements();
  const stripe = useStripe();
  const { data: session } = useSession();
  const createStandalonePayment = useCreateStandalonePaymentMutation();
  const [billingAddress, setBillingAddress] = useState<TBillingAddress | null>(null);
  const [credits, setCredits] = useState<number | undefined>(undefined);
  const [isPaying, setIsPaying] = useState(false);
  const [saveBillingAddressToProfile, setSaveBillingAddressToProfile] = useState<boolean>(false);
  const [stripeElementsReady, setStripeElementsReady] = useState(false);
  const [cachedPaymentMethodId, setCachedPaymentMethodId] = useState<string | null>(null);
  const cachedPaymentMethodIdRef = useRef<string | null>(null);
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

  const savingsText = conversion.data?.discount_pct
    ? `You saved ${conversion.data.discount_pct}%`
    : undefined;

  const limitReached = Boolean(conversionKey) && !conversionAllowed;
  const currentBillingAddress = billingAddress?.country ? billingAddress : null;
  const user = session?.user as User;
  const creditsError = !credits ? messages.creditsAmountRequired : undefined;

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

  const cachePaymentMethodId = useCallback((paymentMethodId: string) => {
    cachedPaymentMethodIdRef.current = paymentMethodId;
    setCachedPaymentMethodId(paymentMethodId);
  }, []);

  const clearCachedPaymentMethodId = useCallback(() => {
    cachedPaymentMethodIdRef.current = null;
    setCachedPaymentMethodId(null);
  }, []);

  const handleCardChange = useCallback(
    (event: StripePaymentElementChangeEvent) => {
      if (isPaying || !cachedPaymentMethodIdRef.current || event.empty) {
        return;
      }

      clearCachedPaymentMethodId();
      void onSetupIntentRefreshNeeded();
    },
    [clearCachedPaymentMethodId, isPaying, onSetupIntentRefreshNeeded]
  );

  const onPay = async () => {
    if (disablePaying) return;
    setIsPaying(true);

    let paymentMethodId: string;
    try {
      paymentMethodId = await resolvePaymentMethodId({
        billingAddress: currentBillingAddress,
        cachedPaymentMethodId,
        elements,
        returnUrl: window.location.href,
        stripe,
        user,
      });
      cachePaymentMethodId(paymentMethodId);
    } catch (error) {
      if (isSetupIntentConsumedError(error)) {
        clearCachedPaymentMethodId();
        await onSetupIntentRefreshNeeded();
      }

      notify.error({
        title: messages.paymentProcessingErrorTitle,
        description: getStripeSetupErrorDescription(error),
        ...notificationConfig,
      });
      setIsPaying(false);
      return;
    }

    try {
      await createStandalonePayment.mutateAsync(
        {
          quote_id: quote.data.quote_id,
          virtual_lab_id: virtualLabId,
          billing_address: currentBillingAddress,
          sync_billing_address_to_profile: saveBillingAddressToProfile,
          payment_method_id: paymentMethodId,
        },
        {
          onSuccess: (res) => {
            notify.success({
              title: 'Payment successful',
              description: messages.paymentSuccess
                .replace('$$credits', credits.toString())
                .replace('$$price', formatMinorCurrency(res.data.amount_total, res.data.currency)),
              ...notificationConfig,
            });
            clearCachedPaymentMethodId();
            const accountingKey = keyBuilder.accounting({ virtualLabId });
            window.setTimeout(() => {
              void queryClient.invalidateQueries({
                queryKey: accountingKey,
              });
            }, 1_000);
          },
          onSettled: async (_, __, vars) => {
            if (vars.sync_billing_address_to_profile) {
              await queryClient.invalidateQueries({
                queryKey: userKeyBuilder.profile(),
              });
            }
          },
        }
      );
      onCancel();
      setIsPaying(false);
    } catch (error) {
      const code = get(error, 'cause.code', 'DEFAULT');
      notify.error({
        title: messages.paymentProcessingErrorTitle,
        description: getBackendPaymentErrorDescription(code, 'standalone'),
        ...notificationConfig,
      });
      setIsPaying(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <CreditsAmountInput
        hint={limitReached ? 'Calculation of order full amount limit reached' : conversionText}
        savingsHint={limitReached ? undefined : savingsText}
        value={credits}
        disabled={isPaying}
        error={creditsError}
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
        onCardChange={handleCardChange}
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
