import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import { importDatePickerChangeToRawValue, parseImportDatePickerValue } from './import-date';

describe('parseImportDatePickerValue', () => {
  it('converts stored ISO strings into Dayjs instances for AntD DatePicker', () => {
    const value = parseImportDatePickerValue('2026-03-24T00:00:00.000Z');

    expect(value?.isValid()).toBe(true);
    expect(value?.toISOString()).toBe('2026-03-24T00:00:00.000Z');
  });

  it('returns null for empty or invalid values', () => {
    expect(parseImportDatePickerValue('')).toBeNull();
    expect(parseImportDatePickerValue(undefined)).toBeNull();
    expect(parseImportDatePickerValue('not-a-date')).toBeNull();
  });
});

describe('importDatePickerChangeToRawValue', () => {
  it('serializes selected dates back into ISO strings for session state', () => {
    expect(importDatePickerChangeToRawValue(dayjs('2026-03-24T00:00:00.000Z'))).toBe(
      '2026-03-24T00:00:00.000Z'
    );
  });

  it('returns an empty string when the picker is cleared', () => {
    expect(importDatePickerChangeToRawValue(null)).toBe('');
  });
});
