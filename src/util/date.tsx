import { formatDistanceToNow, isValid, format, formatDate } from 'date-fns';

export type DateISOString = string;

/**
 * Calculate time elapsed from today to the given day
 *
 * @param stringDate the given date in string format
 */
export default function timeElapsedFromToday(stringDate?: DateISOString) {
  const date = validDate(stringDate);
  return date ? formatDistanceToNow(date, { addSuffix: true }).replace(/^about /, '') : '-';
}

export function dateColumnInfoToRender(createdAtStr: DateISOString) {
  const date = validDate(createdAtStr);
  if (!date)
    return {
      tooltip: '-',
      text: '-',
    };

  return {
    tooltip: format(date, 'dd-MM-yyyy HH:mm:ss'),
    text: timeElapsedFromToday(createdAtStr),
  };
}

function validDate(stringDate?: DateISOString) {
  if (!stringDate) return;
  const date = new Date(stringDate);
  if (!isValid(date)) return;
  return date;
}

function formatTimeHhMm(date: Date) {
  if (!(date instanceof Date)) {
    throw new Error('Input must be a Date object');
  }

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${hours}h${minutes}`;
}

export function renderDateAndHour(date: string) {
  const dateObj = new Date(date);
  return (
    <div className="flex flex-row">
      <span>{formatDate(dateObj, 'dd.MM.yyyy')}</span>
      <span className="px-1">|</span>
      <span>{formatTimeHhMm(dateObj)}</span>
    </div>
  );
}

export function makeDateToAppFormat(input: DateISOString) {
  const date = validDate(input);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const formatted = formatter.format(date).replace(/\//g, '.');
  return formatted;
}
