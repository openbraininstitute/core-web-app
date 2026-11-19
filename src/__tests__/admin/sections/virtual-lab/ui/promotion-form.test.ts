import { describe, expect, it } from 'vitest';

import { atLeast, promotionCreateBody } from '@/admin/sections/virtual-lab/ui/promotion-form';

const VALUES = {
  code: '  spring ',
  description: '',
  credits_amount: 10,
  max_uses_per_user_per_period: 1,
  max_total_uses: null,
  active: true,
  valid_from: '2026-03-01T00:00:00.000Z',
  valid_until: '2026-03-31T12:00:00.000Z',
};

describe('promotionCreateBody', () => {
  it('trims the code, drops empty fields and takes the period from the dates', () => {
    expect(promotionCreateBody(VALUES)).toEqual({
      code: 'spring',
      description: undefined,
      credits_amount: 10,
      max_uses_per_user_per_period: 1,
      max_total_uses: undefined,
      active: true,
      valid_from: VALUES.valid_from,
      valid_until: VALUES.valid_until,
      validity_period_days: 31,
    });
  });

  it('gives a period of at least a day', () => {
    const body = promotionCreateBody({ ...VALUES, valid_until: '2026-03-01T01:00:00.000Z' });
    expect(body.validity_period_days).toBe(1);
  });

  it('keeps a total limit and a description', () => {
    const body = promotionCreateBody({ ...VALUES, description: 'Spring', max_total_uses: 5 });
    expect(body).toMatchObject({ description: 'Spring', max_total_uses: 5 });
  });
});

describe('atLeast', () => {
  const check = (rule: ReturnType<typeof atLeast>, value: number | null) =>
    // biome-ignore lint/style/noNonNullAssertion: the rule always has a validator
    rule.validator!({}, value, () => {});

  it('refuses a value below the minimum, 0 included', async () => {
    await expect(check(atLeast(2, 'Too low'), 1)).rejects.toThrow('Too low');
    await expect(check(atLeast(1, 'Too low'), 0)).rejects.toThrow('Too low');
  });

  it('lets through an empty value, a stored value and a missing minimum', async () => {
    await expect(check(atLeast(2, 'Too low'), null)).resolves.toBeUndefined();
    await expect(check(atLeast(5, 'Too low', 3), 3)).resolves.toBeUndefined();
    await expect(check(atLeast(undefined, 'Too low'), 1)).resolves.toBeUndefined();
  });
});
