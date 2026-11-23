import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PromotionStatus } from '@/admin/sections/virtual-lab/ui/promotion-status';

import type { AdminPromotion } from '@/admin/sections/virtual-lab/api/admin-types';

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();

const promotion = (changes: Partial<AdminPromotion>): AdminPromotion => ({
  id: 'p1',
  code: 'SPRING',
  description: null,
  credits_amount: 10,
  validity_period_days: 30,
  max_uses_per_user_per_period: 1,
  max_total_uses: null,
  current_total_uses: 0,
  active: true,
  valid_from: daysFromNow(-1),
  valid_until: daysFromNow(1),
  created_at: daysFromNow(-2),
  updated_at: daysFromNow(-2),
  created_by: null,
  ...changes,
});

describe('PromotionStatus', () => {
  it.each([
    ['Active', {}],
    ['Switched off', { active: false, valid_until: daysFromNow(-1) }],
    ['Expired', { valid_until: daysFromNow(-0.5) }],
    ['Scheduled', { valid_from: daysFromNow(0.5) }],
    ['Used up', { max_total_uses: 5, current_total_uses: 5 }],
    ['Active', { max_total_uses: 5, current_total_uses: 4 }],
  ])('shows %s', (label, changes) => {
    render(<PromotionStatus promotion={promotion(changes)} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});
