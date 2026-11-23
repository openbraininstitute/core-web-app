import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AccountActions } from '@/admin/sections/accounting/ui/account-actions';

import type { TAccount } from '@/admin/sections/accounting/types';

const { topUpMock } = vi.hoisted(() => ({ topUpMock: vi.fn() }));

vi.mock('@/admin/sections/accounting/api', () => ({
  topUp: topUpMock,
  listProjectAccounts: vi.fn(),
}));
vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const LAB: TAccount = {
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  name: 'Lab one',
  balance: '100.00',
  enabled: true,
  account_type: 'vlab',
  parent_id: null,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

const renderActions = (account: TAccount) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AccountActions account={account} />
    </QueryClientProvider>
  );

describe('AccountActions', () => {
  it('offers only Enable on a disabled account', () => {
    renderActions({ ...LAB, enabled: false });

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Enable']);
  });

  it('sends a top-up amount as the string the operator typed', async () => {
    topUpMock.mockResolvedValue(null);
    renderActions(LAB);

    fireEvent.click(screen.getByRole('button', { name: 'Top up' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '12.5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Top up' }));

    await waitFor(() =>
      expect(topUpMock).toHaveBeenCalledWith({ vlab_id: LAB.id, amount: '12.5' })
    );
  });
});
