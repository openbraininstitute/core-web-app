import { formatDate } from '@/util/utils';

// Some columns store UTC with no offset, such as a subscription's period, and `Date` would read
// those as local time.
export const asUtc = (iso: string) => (/(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`);

export const formatDateTime = (iso: string) => formatDate(asUtc(iso), 'dd.MM.yyyy | HH:mm');
