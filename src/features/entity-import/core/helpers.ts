import dayjs from 'dayjs';

import type { Dayjs } from 'dayjs';

export function parseImportDatePickerValue(value: string | null | undefined): Dayjs | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

export function importDatePickerChangeToRawValue(date: Dayjs | null): string {
  if (!date) {
    return '';
  }

  return date.toISOString();
}
