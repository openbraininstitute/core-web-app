import { expect, test } from 'vitest';

import { ApiError } from '@/api/error';
import { reasonOf } from '@/features/logbook/log/notice';

test('a failure reads as the server said it, else as its status, in plain words', () => {
  expect(reasonOf(new ApiError('x', { status: 409, detail: 'The name is taken.' }))).toBe(
    'The name is taken.'
  );
  expect(reasonOf(new ApiError('Error while fetching u', { status: 403 }))).toContain('permission');
  expect(reasonOf(new ApiError('Error while fetching u', { status: 502 }))).toContain('server');
  expect(reasonOf(new ApiError('Error while fetching u', { status: 418 }))).toContain('HTTP 418');
  expect(reasonOf(new TypeError('Failed to fetch'))).toContain("can't be reached");
});
