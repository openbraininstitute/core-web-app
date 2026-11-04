import { formatDate } from '@/util/utils';

// Some columns store UTC with no offset, such as a subscription's period, and `Date` would read
// those as local time.
export function asUtc(iso: string) {
  return /(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;
}

export function formatDateTime(iso: string) {
  return formatDate(asUtc(iso), 'dd.MM.yyyy | HH:mm');
}

// Amounts arrive as integer cents.
export function formatMoney(cents: number, currency: string) {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}
