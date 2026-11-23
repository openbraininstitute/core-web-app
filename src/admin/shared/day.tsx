import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { parseAsString, useQueryState } from 'nuqs';

export const DAY_FORMAT = 'YYYY-MM-DD';

/** A day from the URL, or null when dayjs would roll it over into another day. */
export function parseDay(value: string) {
  const day = dayjs(value);
  return day.isValid() && day.format(DAY_FORMAT) === value ? day : null;
}

const dayParam = parseAsString.withDefault('').withOptions({ shallow: true });

/** A `from`/`to` day range kept in the URL, with its picker. */
export function useDayRange() {
  const [from, setFrom] = useQueryState('from', dayParam);
  const [to, setTo] = useQueryState('to', dayParam);

  return {
    from,
    to,
    control: (
      <DatePicker.RangePicker
        value={[parseDay(from), parseDay(to)]}
        onChange={(dates) => {
          setFrom(dates?.[0]?.format(DAY_FORMAT) ?? '');
          setTo(dates?.[1]?.format(DAY_FORMAT) ?? '');
        }}
      />
    ),
  };
}
