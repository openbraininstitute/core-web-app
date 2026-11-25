import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PriceActions } from '@/admin/sections/accounting/ui/price-actions';
import { ApiError } from '@/api/error';

import type { TPrice } from '@/admin/sections/accounting/types';

const { assertEndMock, expireMock, updateMock, errorMock } = vi.hoisted(() => ({
  assertEndMock: vi.fn(),
  expireMock: vi.fn(),
  updateMock: vi.fn(),
  errorMock: vi.fn(),
}));

vi.mock('@/admin/sections/accounting/api', () => ({
  assertPriceEdit: vi.fn(),
  assertPriceEnd: assertEndMock,
  createPrice: vi.fn(),
  expirePrice: expireMock,
  getAccount: vi.fn(),
  listPricesFor: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  replacePrice: vi.fn(),
  updatePrice: updateMock,
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

beforeEach(() => vi.clearAllMocks());

describe('PriceActions', () => {
  it.each([
    ['a scheduled price', SCHEDULED, ['Edit', 'Change end']],
    ['a price in use', ACTIVE, ['Change price', 'Set end']],
    ['an expired price', { ...ACTIVE, valid_to: hours(-1) }, []],
  ])('offers the right actions on %s', (_, price, expected) => {
    renderActions(price);
    expect(buttons()).toEqual(expected);
  });

  it.each([
    [
      'a storage price',
      { ...ACTIVE, service_type: 'storage', service_subtype: 'storage' },
      /running storage jobs move to the next price/,
    ],
    ['a oneshot price', ACTIVE, /Jobs reserved before the end keep this price/],
  ])('says what happens to running jobs when ending %s', async (_, price, text) => {
    renderActions(price as TPrice);

    fireEvent.click(screen.getByRole('button', { name: 'Set end' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText(text)).toBeTruthy();
  });

  it('starts Change price with the old end kept', async () => {
    renderActions({ ...ACTIVE, valid_to: hours(48) });

    fireEvent.click(screen.getByRole('button', { name: 'Change price' }));
    const dialog = await screen.findByRole('dialog');

    expect((within(dialog).getByLabelText('Ends') as HTMLInputElement).value).not.toBe('');
  });

  it("offers nothing on a legacy price, and says it can't be ended", () => {
    renderActions({ ...ACTIVE, service_subtype: 'ml-rag' } as TPrice);

    expect(buttons()).toEqual([]);
    expect(screen.getByText(/no new price can take over/)).toBeTruthy();
  });

  it('never ends a price when nothing would take over, and keeps the dialog open', async () => {
    assertEndMock.mockRejectedValue(new ApiError('No other price would apply', { status: 400 }));
    renderActions(SCHEDULED);

    fireEvent.click(screen.getByRole('button', { name: 'Change end' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Set end' }));

    await waitFor(() => expect(errorMock).toHaveBeenCalled());
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(assertEndMock).toHaveBeenCalledWith(SCHEDULED, SCHEDULED.valid_to);
    expect(expireMock).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('refuses to save an edit once the price has started since the page loaded', async () => {
    renderActions(SCHEDULED);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Review' }));
    fireEvent.change(await within(dialog).findByRole('textbox'), {
      target: { value: SCHEDULED.service_subtype },
    });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.parse(SCHEDULED.valid_from) + 60_000);
    try {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(errorMock).toHaveBeenCalledWith(
          expect.objectContaining({ description: expect.stringMatching(/has started/) })
        )
      );
      expect(updateMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
