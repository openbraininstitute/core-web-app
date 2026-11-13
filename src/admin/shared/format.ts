import { formatDate } from '@/util/utils';

// Some columns store UTC with no offset, such as a subscription's period, and `Date` would read
// those as local time.
export function formatDateTime(iso: string) {
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/.test(iso);
  return formatDate(hasOffset ? iso : `${iso}Z`, 'dd.MM.yyyy | HH:mm');
}
