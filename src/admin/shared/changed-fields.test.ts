import { describe, expect, it } from 'vitest';

import { changedFields } from './changed-fields';

describe('changedFields', () => {
  it('keeps only what differs', () => {
    expect(changedFields({ name: 'b', active: true }, { name: 'a', active: true })).toEqual({
      name: 'b',
    });
  });

  it('reports no change for an unset field over a null column', () => {
    expect(changedFields({ discount: undefined }, { discount: null })).toEqual({});
  });

  it('keeps a false and a zero', () => {
    expect(changedFields({ active: false, credits: 0 }, { active: true, credits: 5 })).toEqual({
      active: false,
      credits: 0,
    });
  });

  it('keeps a null that clears a value', () => {
    expect(changedFields({ max_credits: null }, { max_credits: 10 })).toEqual({
      max_credits: null,
    });
  });
});
