import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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

  describe('in a zone ahead of UTC', () => {
    const tz = process.env.TZ;
    beforeAll(() => {
      process.env.TZ = 'Europe/Zurich';
    });
    afterAll(() => {
      process.env.TZ = tz;
    });

    it('sends the picked local days as naive UTC, without an offset', () => {
      expect(
        paymentFilters({ type: 'subscription', from: '2026-06-10', to: '2026-06-11' })
      ).toMatchObject({
        start_date: '2026-06-09T22:00:00.000',
        end_date: '2026-06-11T21:59:59.999',
      });
    });
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
