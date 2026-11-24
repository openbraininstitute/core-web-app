import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DiscountActions,
  NewDiscountButton,
} from '@/admin/sections/accounting/ui/discount-actions';

import type { ReactNode } from 'react';
import type { TDiscount } from '@/admin/sections/accounting/types';

const { createMock, updateMock, deleteMock, LAB_ID, SCHEDULED, ACTIVE, EXPIRED, hours } =
  vi.hoisted(() => {
    const at = (count: number) => new Date(Date.now() + count * 3_600_000).toISOString();
    const scheduled: TDiscount = {
      id: 7,
      vlab_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      discount: '0.2',
      valid_from: at(24),
      valid_to: at(48),
    };
    return {
      createMock: vi.fn(),
      updateMock: vi.fn(),
      deleteMock: vi.fn(),
      LAB_ID: scheduled.vlab_id,
      SCHEDULED: scheduled,
      ACTIVE: { ...scheduled, id: 8, valid_from: at(-24), valid_to: null } as TDiscount,
      EXPIRED: { ...scheduled, id: 9, discount: '0.5', valid_from: at(-48), valid_to: at(-24) },
      hours: at,
    };
  });

vi.mock('@/admin/sections/accounting/api', () => ({
  createDiscount: createMock,
  updateDiscount: updateMock,
  deleteDiscount: deleteMock,
  getAccount: vi.fn().mockResolvedValue({ id: LAB_ID, name: 'Lab one' }),
  listDiscounts: vi.fn().mockResolvedValue({ data: [ACTIVE, EXPIRED], pagination: { total: 2 } }),
}));
vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const renderWithQuery = (children: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>);

afterEach(() => {
  vi.useRealTimers();
});

const buttons = () => screen.queryAllByRole('button').map((button) => button.textContent);

describe('DiscountActions', () => {
  it('lets a scheduled discount be edited or deleted', () => {
    renderWithQuery(<DiscountActions discount={SCHEDULED} />);
    expect(buttons()).toEqual(['Edit', 'Delete']);
  });

  it('lets a started discount change only its end', async () => {
    renderWithQuery(<DiscountActions discount={ACTIVE} />);
    expect(buttons()).toEqual(['Change end']);

    fireEvent.click(screen.getByRole('button', { name: 'Change end' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('spinbutton')).toBeNull();
    expect(within(dialog).getByLabelText('Ends')).toBeTruthy();
    expect(within(dialog).queryByLabelText('Starts')).toBeNull();
  });

  it('offers nothing on an expired discount', () => {
    renderWithQuery(
      <DiscountActions discount={{ ...SCHEDULED, valid_from: hours(-48), valid_to: hours(-24) }} />
    );
    expect(buttons()).toEqual([]);
  });

  it('sends only the share when only the share changed', async () => {
    updateMock.mockResolvedValue({ ...SCHEDULED, discount: '0.25' });
    renderWithQuery(<DiscountActions discount={SCHEDULED} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '25' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith(7, { discount: '0.25' }));
  });

  it('still saves when the start passes while the dialog is open', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const soon = { ...SCHEDULED, valid_from: hours(2 / 60) };
    updateMock.mockResolvedValue({ ...soon, discount: '0.25' });
    renderWithQuery(<DiscountActions discount={soon} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    vi.setSystemTime(Date.now() + 10 * 60_000);
    fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '25' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith(7, { discount: '0.25' }));
    expect(within(dialog).queryByText("Can't be in the past")).toBeNull();
  });

  it('deletes a scheduled discount by its id', async () => {
    deleteMock.mockResolvedValue(null);
    renderWithQuery(<DiscountActions discount={SCHEDULED} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(7));
  });
});

describe('NewDiscountButton', () => {
  it("lists the lab's current discounts and starts a new one now", async () => {
    createMock.mockResolvedValue(SCHEDULED);
    renderWithQuery(<NewDiscountButton vlabId={LAB_ID} />);

    const button = () => screen.getByRole('button', { name: 'New discount' });
    await waitFor(() => expect(button().hasAttribute('disabled')).toBe(false));
    fireEvent.click(button());
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/20% from .*, no end/)).toBeTruthy();
    expect(within(dialog).queryByText(/^50% from/)).toBeNull();
    expect(within(dialog).getByText(/the one that started last applies/)).toBeTruthy();

    fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '12.5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add discount' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const [body] = createMock.mock.calls[0];
    expect(body).toEqual({ vlab_id: LAB_ID, discount: '0.125', valid_from: expect.any(String) });
    expect(Math.abs(Date.parse(body.valid_from) - Date.now())).toBeLessThan(60_000);
  });
});
