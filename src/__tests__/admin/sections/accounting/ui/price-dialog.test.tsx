import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PriceDialog } from '@/admin/sections/accounting/ui/price-dialog';
import { ApiError } from '@/api/error';

import type { TPriceValues } from '@/admin/sections/accounting/types';

const { errorMock } = vi.hoisted(() => ({ errorMock: vi.fn() }));

vi.mock('@/admin/sections/accounting/api', () => ({
  listPricesFor: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
}));
vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({ success: vi.fn(), error: errorMock }),
}));

const VALUES: TPriceValues = {
  service_type: 'oneshot',
  service_subtype: 'ml-llm',
  valid_from: new Date(Date.now() + 3_600_000).toISOString(),
  tiers: [{ multiplier: '0.1' }],
};

function renderDialog({
  write,
  vlabId = '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  initialValues = VALUES,
}: {
  write: () => Promise<unknown>;
  vlabId?: string | null;
  initialValues?: Partial<TPriceValues>;
}) {
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PriceDialog
        title="Price"
        vlabId={vlabId}
        initialValues={initialValues}
        keyLocked
        okText="Save"
        write={write}
        done="Saved"
        failed="Couldn't save"
        onClose={onClose}
      />
    </QueryClientProvider>
  );
  return onClose;
}

const dialog = () => screen.getByRole('dialog');
const click = (name: string) => fireEvent.click(within(dialog()).getByRole('button', { name }));

async function review() {
  click('Review');
  await within(dialog()).findByText(/Cost before any lab discount/);
}

describe('PriceDialog', () => {
  it('closes when the outcome is unknown, so a second click cannot add it twice', async () => {
    const onClose = renderDialog({
      write: () => Promise.reject(new ApiError('may or may not', { code: 'OUTCOME_UNKNOWN' })),
    });

    await review();
    click('Save');

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('stays open after a refusal, to fix the price', async () => {
    const onClose = renderDialog({
      write: () => Promise.reject(new ApiError('Only prices valid in the future', { status: 400 })),
    });

    await review();
    click('Save');

    await waitFor(() => expect(errorMock).toHaveBeenCalled());
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('saves a default price only once its subtype is typed', async () => {
    const write = vi.fn().mockResolvedValue(null);
    renderDialog({ write, vlabId: null });

    await review();
    const save = within(dialog()).getByRole('button', { name: 'Save' });
    expect(save.hasAttribute('disabled')).toBe(true);
    fireEvent.change(within(dialog()).getByLabelText(/to confirm/), {
      target: { value: 'ml-llm' },
    });
    click('Save');

    await waitFor(() => expect(write).toHaveBeenCalled());
    expect(write.mock.calls[0][0]).toMatchObject({
      vlab_id: null,
      tiers: [{ min_quantity: 0, max_quantity: null, fixed_cost: '0', multiplier: '0.1' }],
    });
  });

  it('gives storage one rate with no fixed cost and no more tiers', () => {
    renderDialog({
      write: vi.fn(),
      initialValues: { ...VALUES, service_type: 'storage', service_subtype: 'storage' },
    });

    expect(within(dialog()).queryByRole('button', { name: 'Add a tier' })).toBeNull();
    expect(within(dialog()).queryByLabelText('Tier 1 fixed cost')).toBeNull();
    expect(within(dialog()).getByLabelText('Tier 1 rate')).toBeTruthy();
  });

  it('holds the review back until each closed tier has an end', async () => {
    renderDialog({ write: vi.fn() });

    click('Add a tier');
    click('Review');

    expect((await within(dialog()).findAllByText('Required')).length).toBeGreaterThan(0);
    expect(within(dialog()).queryByText(/Cost before any lab discount/)).toBeNull();
  });
});
