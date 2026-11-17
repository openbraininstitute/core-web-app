import { describe, expect, it } from 'vitest';

import { formatDateTime } from '@/admin/shared/format';

describe('formatDateTime', () => {
  it('reads a timestamp with no offset as UTC', () => {
    expect(formatDateTime('2026-03-11T15:31:00')).toBe(formatDateTime('2026-03-11T15:31:00Z'));
  });

  it('keeps an explicit offset', () => {
    expect(formatDateTime('2026-03-11T16:31:00+01:00')).toBe(
      formatDateTime('2026-03-11T15:31:00Z')
    );
  });
});
