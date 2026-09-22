import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CampaignScanCards } from '@/features/data-grid/bindings/entitycore/renderers/campaign-scan-cards';

const UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

const records = [
  {
    id: 'sim-1',
    name: 'Skeletonization 0',
    scan_parameters: {
      'initialize.cell_mesh': { type: 'EMCellMeshFromID', id_str: UUID },
      'initialize.random_seed': 7,
    },
  },
];

describe('scan-parameter cards — entity references', () => {
  it('shows the id rather than the reference JSON', () => {
    render(<CampaignScanCards records={records} />);

    expect(screen.getByText(UUID)).toBeTruthy();
    expect(screen.queryByText(/EMCellMeshFromID/)).toBeNull();
  });

  it('copies the id from anywhere on the value, not just the icon', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<CampaignScanCards records={records} />);
    // the whole value is the control, so clicking its text copies
    fireEvent.click(screen.getByText(UUID));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(UUID));
    await waitFor(() => expect(screen.getByLabelText(`Copy ID ${UUID}`).title).toBe('Copied'));
  });

  it('leaves a plain value as static text', () => {
    render(<CampaignScanCards records={records} />);

    expect(screen.queryByLabelText('Copy ID 7')).toBeNull();
    expect(screen.getByText('7')).toBeTruthy();
  });
});
