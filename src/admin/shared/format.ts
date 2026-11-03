import { format } from 'date-fns';

export function formatDateTime(iso: string) {
  return format(new Date(iso), 'dd.MM.yyyy | HH:mm');
}
