import { StripeSetupConfirmationError } from '@/features/stripe/confirm-setup';
import { messages } from '@/i18n/en/payment';

export function isSetupIntentConsumedError(error: unknown): boolean {
  if (!(error instanceof StripeSetupConfirmationError)) {
    return false;
  }

  if (error.reason === 'missing_payment_method') {
    return true;
  }

  if (error.reason !== 'stripe_error' || !error.message) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes('already succeeded') ||
    message.includes('already been confirmed') ||
    message.includes('invalid status') ||
    message.includes('unexpected_state')
  );
}

export function getStripeSetupErrorDescription(error: unknown): string {
  if (error instanceof StripeSetupConfirmationError && error.reason === 'missing_payment_method') {
    return messages.paymentMethodSaveError;
  }

  if (isSetupIntentConsumedError(error)) {
    return messages.setupIntentSessionExpired;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return messages.paymentProcessingErrorFallback;
}

export function getBackendPaymentErrorDescription(
  code: string,
  flow: 'standalone' | 'subscription' = 'standalone'
): string {
  const errors =
    flow === 'subscription'
      ? {
          ENTITY_ALREADY_EXISTS: messages.subscriptionPaymentErrorEntityAlreadyExists,
          ENTITY_NOT_CREATED: messages.subscriptionPaymentErrorEntityNotCreated,
          ENTITY_NOT_FOUND: messages.subscriptionPaymentErrorEntityNotFound,
          PAYMENT_ERROR: messages.paymentProcessingErrorBillingCountryMismatch,
          DEFAULT: messages.paymentProcessingError,
        }
      : {
          ENTITY_ALREADY_EXISTS: messages.paymentProcessingErrorEntityAlreadyExists,
          ENTITY_NOT_CREATED: messages.paymentProcessingErrorEntityNotCreated,
          ENTITY_NOT_FOUND: messages.paymentProcessingErrorEntityNotFound,
          PAYMENT_ERROR: messages.paymentProcessingErrorBillingCountryMismatch,
          DEFAULT: messages.paymentProcessingError,
        };

  return errors[code as keyof typeof errors] ?? messages.paymentProcessingError;
}
