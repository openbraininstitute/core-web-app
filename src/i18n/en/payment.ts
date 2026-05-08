export const messages = {
  paymentProcessingErrorTitle: 'Payment processing error',
  paymentMethodSaveError:
    'We couldn’t save your payment method. Please try again, or use a different card.',
  paymentProcessingErrorFallback:
    "We couldn't process your payment. Please check your card details and try again.",
  paymentSuccess: `Successfully purchased $$credits credits for $$amount $$currency`,
  paymentProcessingError:
    'There was a problem processing your payment. Please try again or contact support if the issue persists.',
  paymentProcessingErrorEntityAlreadyExists: 'This payment has already been processed',
  paymentProcessingErrorEntityNotCreated:
    "We couldn't process your payment at this time. Please try again or contact our support team for help.",
  paymentProcessingErrorEntityNotFound:
    "We couldn't find your payment details. Please try again or contact support if the issue persists.",
  subscriptionPaymentSuccess: 'Subscription created successfully',
  subscriptionPaymentSuccessDescription: 'You now have full access to the platform',
  subscriptionPaymentErrorEntityAlreadyExists: 'You already have an active subscription',
  subscriptionPaymentErrorEntityNotCreated:
    "We couldn't set up your subscription at this time. Please try again or contact our support team for help.",
  subscriptionPaymentErrorEntityNotFound:
    "We couldn't find your subscription details. Please try again or contact support if the issue persists.",
  subscriptionDowngradeSuccessTitle: 'Your subscription has been canceled successfully.',
  subscriptionDowngradeSuccessDescription:
    'You’ll continue to have access to all Pro features until your current billing period ends $$date.',
  subscriptionDowngradeErrorTitle: 'There was a problem canceling your subscription.',
  subscriptionDowngradeErrorDescription:
    'Please try again or contact support if the issue persists.',
  subscriptionDowngradeErrorEntityNotFoundDescription: "You don't have an active subscription",
  subscriptionDowngradeErrorInvalidRequestDescription:
    'This subscription has already been cancelled and cannot be cancelled again',
};
