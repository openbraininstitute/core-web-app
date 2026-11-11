import { get } from 'es-toolkit/compat';

export const LOW_CREDITS_ERROR_CODES = [
  'ACCOUNTING_INSUFFICIENT_FUNDS_ERROR', // accounting service
  'INSUFFICIENT_FUNDS_ERROR', // notebook service
  'INSUFFICIENT_FUNDS', // synaptome builder
] as const;

export const LOW_CREDITS_HTTP_STATUSES = [461] as const;

const LOW_CREDITS_ERROR_CODE_SET: ReadonlySet<string> = new Set(LOW_CREDITS_ERROR_CODES);
const LOW_CREDITS_HTTP_STATUS_SET: ReadonlySet<number> = new Set(LOW_CREDITS_HTTP_STATUSES);

function isLowCreditsCode(value: unknown): boolean {
  return typeof value === 'string' && LOW_CREDITS_ERROR_CODE_SET.has(value);
}

/**
 * free-text `detail` (no error code).
 */
function detailMentionsCredits(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const detail = value.toLowerCase();
  return detail.includes('insufficient') || detail.includes('credits');
}

export function isLowCreditsError(input: unknown): boolean {
  if (input == null) return false;

  if (typeof input === 'number') {
    return LOW_CREDITS_HTTP_STATUS_SET.has(input);
  }

  if (
    isLowCreditsCode(get(input, 'cause.code')) ||
    isLowCreditsCode(get(input, 'cause.error_code'))
  ) {
    return true;
  }

  if (isLowCreditsCode(get(input, 'error_code')) || isLowCreditsCode(get(input, 'code'))) {
    return true;
  }

  const status = get(input, 'status');
  if (typeof status === 'number' && LOW_CREDITS_HTTP_STATUS_SET.has(status)) {
    return true;
  }

  return (
    detailMentionsCredits(get(input, 'detail')) || detailMentionsCredits(get(input, 'cause.detail'))
  );
}
