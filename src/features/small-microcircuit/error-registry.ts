import { messages } from '@/i18n/en/simulation';

const errorCodeToTranslationKey: Record<string, string> = {
  ACCOUNTING_INSUFFICIENT_FUNDS_ERROR: messages.LowFundsError,
};

export default errorCodeToTranslationKey;
