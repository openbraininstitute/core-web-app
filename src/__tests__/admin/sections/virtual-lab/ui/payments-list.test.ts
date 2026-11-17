import { describe, expect, it } from 'vitest';

import { paymentFilters } from '@/admin/sections/virtual-lab/ui/payments-list';

describe('paymentFilters', () => {
  it('sends no filters for an unfiltered page', () => {
    expect(paymentFilters({ type: 'any', from: '', to: '' })).toEqual({
      card_last4: undefined,
      payment_type: undefined,
      start_date: undefined,
      end_date: undefined,
    });
  });

  it('sends whole days as naive UTC, without an offset', () => {
    const { start_date: start, end_date: end } = paymentFilters({
      type: 'subscription',
      from: '2026-06-10',
      to: '2026-06-11',
    });

    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/);
    expect(new Date(`${end}Z`).getTime() - new Date(`${start}Z`).getTime()).toBe(
      2 * 24 * 3600 * 1000 - 1
    );
  });

  it('ignores a mangled date from the URL', () => {
    expect(paymentFilters({ type: 'any', from: 'yesterday', to: '2026-13-40' })).toMatchObject({
      start_date: undefined,
      end_date: undefined,
    });
  });

  it('passes the card digits and the payment type through', () => {
    expect(paymentFilters({ card: '4242', type: 'standalone', from: '', to: '' })).toMatchObject({
      card_last4: '4242',
      payment_type: 'standalone',
    });
  });
});
