import { messages } from '@/i18n/en/simulation';

export const errorRegistry: Record<string, string> = {
  ACCOUNTING_INSUFFICIENT_FUNDS_ERROR: messages.LowFundsError,
};

export default errorRegistry;
