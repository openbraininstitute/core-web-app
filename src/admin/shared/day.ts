import dayjs from 'dayjs';

export const DAY_FORMAT = 'YYYY-MM-DD';

/** A day from the URL, or null when dayjs would roll it over into another day. */
export function parseDay(value: string) {
  const day = dayjs(value);
  return day.isValid() && day.format(DAY_FORMAT) === value ? day : null;
}
