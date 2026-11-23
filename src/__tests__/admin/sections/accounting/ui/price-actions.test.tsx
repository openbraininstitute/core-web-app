import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PriceActions } from '@/admin/sections/accounting/ui/price-actions';
import { ApiError } from '@/api/error';

import type { TPrice } from '@/admin/sections/accounting/types';

const { assertAfterMock, expireMock, errorMock } = vi.hoisted(() => ({
  assertAfterMock: vi.fn(),
  expireMock: vi.fn(),
  errorMock: vi.fn(),
}));

vi.mock('@/admin/sections/accounting/api', () => ({
  assertPriceAfter: assertAfterMock,
  assertPriceEdit: vi.fn(),
  createPrice: vi.fn(),
  expirePrice: expireMock,
  getAccount: vi.fn(),
  listPricesFor: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  replacePrice: vi.fn(),
  updatePrice: vi.fn(),
}));
vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({ success: vi.fn(), error: errorMock }),
}));

const hours = (count: number) => new Date(Date.now() + count * 3_600_000).toISOString();

const ACTIVE: TPrice = {
  id: 3,
  service_type: 'oneshot',
  service_subtype: 'ml-llm',
  vlab_id: null,
  valid_from: hours(-24),
  valid_to: null,
  tiers: [{ min_quantity: 0, max_quantity: null, fixed_cost: '0', multiplier: '0.1' }],
  created_at: hours(-48),
  updated_at: hours(-48),
};
const SCHEDULED: TPrice = { ...ACTIVE, id: 4, valid_from: hours(24), valid_to: hours(48) };

const renderActions = (price: TPrice) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PriceActions price={price} />
    </QueryClientProvider>
  );

const buttons = () => screen.queryAllByRole('button').map((button) => button.textContent);

describe('PriceActions', () => {
  it.each([
    ['a scheduled price', SCHEDULED, ['Edit', 'Change end']],
    ['a price in use', ACTIVE, ['Change price', 'Set end']],
    ['an expired price', { ...ACTIVE, valid_to: hours(-1) }, []],
    ['a legacy subtype', { ...ACTIVE, service_subtype: 'ml-rag' } as TPrice, ['Set end']],
  ])('offers the right actions on %s', (_, price, expected) => {
    renderActions(price);
    expect(buttons()).toEqual(expected);
  });

  it('never ends a price when nothing would take over, and keeps the dialog open', async () => {
    assertAfterMock.mockRejectedValue(new ApiError('No other price would apply', { status: 400 }));
    renderActions(SCHEDULED);

    fireEvent.click(screen.getByRole('button', { name: 'Change end' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Set end' }));

    await waitFor(() => expect(errorMock).toHaveBeenCalled());
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(assertAfterMock).toHaveBeenCalledWith(SCHEDULED, SCHEDULED.valid_to, SCHEDULED.id);
    expect(expireMock).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
