import { describe, expect, it } from 'vitest';

import { projectRole, userDisplayName } from './user-roles';

import type { AdminUser } from '../api/admin-types';

const MEMBERSHIP = { id: 'p1', name: 'P', virtual_lab_id: 'v1', role: 'member' };

describe('projectRole', () => {
  it('corrects a member whose groups say waitlisted', () => {
    expect(projectRole(MEMBERSHIP, ['/proj/v1/p1/waitlisted'])).toBe('waitlisted');
  });

  it('keeps the reported role otherwise', () => {
    expect(projectRole(MEMBERSHIP, ['/proj/v1/p1/member', '/proj/v1/p2/waitlisted'])).toBe(
      'member'
    );
    expect(projectRole({ ...MEMBERSHIP, role: 'admin' }, ['/proj/v1/p1/admin'])).toBe('admin');
  });
});

describe('userDisplayName', () => {
  it('prefers the full name and falls back to the username', () => {
    const user = { username: 'ada', firstName: 'Ada', lastName: 'L' } as AdminUser;
    expect(userDisplayName(user)).toBe('Ada L');
    expect(userDisplayName({ ...user, firstName: null, lastName: null })).toBe('ada');
  });
});
