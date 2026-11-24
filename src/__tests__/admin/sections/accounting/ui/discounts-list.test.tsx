import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import { deriveCapabilities } from '@/admin/capabilities/derive';
import { ACCOUNTING_ADMIN_GROUP } from '@/admin/capabilities/registry';
import { DiscountsList } from '@/admin/sections/accounting/ui/discounts-list';
import { CapabilitiesProvider } from '@/admin/shell/capability-gate';

import type { TDiscount } from '@/admin/sections/accounting/types';

const { updateMock, SCHEDULED } = vi.hoisted(() => {
  const at = (count: number) => new Date(Date.now() + count * 3_600_000).toISOString();
  return {
    updateMock: vi.fn(),
    SCHEDULED: {
      id: 7,
      vlab_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      discount: '0.2',
      valid_from: at(24),
      valid_to: at(48),
    } as TDiscount,
  };
});

vi.mock('@/admin/sections/accounting/api', () => ({
  listDiscounts: vi.fn().mockResolvedValue({ data: [SCHEDULED], pagination: { total: 1 } }),
  updateDiscount: updateMock,
  createDiscount: vi.fn(),
  deleteDiscount: vi.fn(),
  getAccount: vi.fn(),
}));
vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({ success: vi.fn(), error: vi.fn() }),
}));

describe('DiscountsList', () => {
  it('edits a discount from its row, typing in the dialog as usual', async () => {
    updateMock.mockResolvedValue({ ...SCHEDULED, discount: '0.25' });
    render(
      <NuqsTestingAdapter>
        <QueryClientProvider client={new QueryClient()}>
          <CapabilitiesProvider value={deriveCapabilities([ACCOUNTING_ADMIN_GROUP])}>
            <DiscountsList />
          </CapabilitiesProvider>
        </QueryClientProvider>
      </NuqsTestingAdapter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    const percent = within(dialog).getByRole('spinbutton');
    fireEvent.keyDown(percent, { key: 'Backspace' });
    fireEvent.change(percent, { target: { value: '25' } });
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith(7, { discount: '0.25' }));
  });
});
