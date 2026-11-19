import { describe, expect, it } from 'vitest';

import { CourseStatus } from '@/admin/sections/virtual-lab/api/admin-types';
import { courseActions } from '@/admin/sections/virtual-lab/helpers';

const NOW = new Date('2026-06-15T12:00:00Z');
const PAST = '2026-06-01T00:00:00Z';
const FUTURE = '2026-07-01T00:00:00Z';

describe('courseActions', () => {
  it('lets a draft be activated and deleted, but not take seats', () => {
    expect(courseActions({ status: CourseStatus.Draft, last_drop_date: PAST }, NOW)).toEqual([
      'edit',
      'activate',
      'void',
      'delete',
    ]);
  });

  it('lets an active course past its last drop date transfer seats, but not be deleted', () => {
    expect(courseActions({ status: CourseStatus.Active, last_drop_date: PAST }, NOW)).toEqual([
      'edit',
      'provision',
      'transfer',
      'void',
    ]);
  });

  it('keeps transfer until the last drop date has passed', () => {
    expect(courseActions({ status: CourseStatus.Active, last_drop_date: FUTURE }, NOW)).toEqual([
      'edit',
      'provision',
      'void',
    ]);
    expect(
      courseActions({ status: CourseStatus.Active, last_drop_date: NOW.toISOString() }, NOW)
    ).not.toContain('transfer');
  });

  it('only lets a voided course be deleted', () => {
    expect(courseActions({ status: CourseStatus.Voided, last_drop_date: PAST }, NOW)).toEqual([
      'delete',
    ]);
  });
});
