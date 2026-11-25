import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PriceTiersTable } from '@/admin/sections/accounting/ui/price-parts';

import type { TPricing } from '@/admin/sections/accounting/types';

describe('PriceTiersTable', () => {
  it('shows the one tier accounting charges storage by, and says more are stored', () => {
    const pricing: TPricing = {
      service_type: 'storage',
      tiers: [
        { min_quantity: 0, max_quantity: 10, fixed_cost: '2', multiplier: '0.1' },
        { min_quantity: 10, max_quantity: null, fixed_cost: '0', multiplier: '0.05' },
      ],
    };

    render(<PriceTiersTable pricing={pricing} />);

    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('0.1')).toBeTruthy();
    expect(screen.queryByText('0.05')).toBeNull();
    expect(screen.getByText(/2 tiers stored/)).toBeTruthy();
  });

  it('leaves out a zero-width tier, as accounting never charges it', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const pricing: TPricing = {
      service_type: 'oneshot',
      tiers: [
        { min_quantity: 0, max_quantity: 10, fixed_cost: '0', multiplier: '0.1' },
        { min_quantity: 10, max_quantity: 10, fixed_cost: '5', multiplier: '0' },
        { min_quantity: 10, max_quantity: null, fixed_cost: '0', multiplier: '0.05' },
      ],
    };

    render(<PriceTiersTable pricing={pricing} />);

    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.queryByText('5')).toBeNull();
    expect(screen.queryByText(/tiers stored/)).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
