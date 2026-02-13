import { messages } from '@/i18n/en/simulation';

export const errorRegistry: Record<string, string> = {
  ACCOUNTING_INSUFFICIENT_FUNDS_ERROR: messages.LowFundsError,
  AUTH_CONSENT_CANCELLED:
    'The consent step was cancelled. No $$ was started. Please try again when you’re ready.',
  AUTH_CONSENT_DENIED:
    'Offline access was declined. The $$ requires this permission to run. Please grant consent to proceed.',
  AUTH_CONSENT_TIMEOUT:
    'The consent step timed out. Please try again and complete the consent when prompted.',
};

export default errorRegistry;
