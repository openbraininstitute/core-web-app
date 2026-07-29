import { fireEvent, render, screen, within } from '@testing-library/react';
import { getDefaultStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearScanValueSelectionAtom,
  scanValueSelectionAtom,
} from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import ParameterSweep, {
  ScanValueSelectorProvider,
  sweepSingleValue,
} from '@/features/scan-config/components/ui-elements/parameter-sweep';

function renderSweep(
  value: (number | null)[],
  { withScope = false }: { withScope?: boolean } = {},
  onChange = vi.fn()
) {
  const sweep = (
    <ParameterSweep
      k="origin_x"
      min={undefined}
      max={undefined}
      exclusiveMin={undefined}
      exclusiveMax={undefined}
      disabled={false}
      value={value}
      onChange={onChange}
    />
  );
  render(
    withScope ? (
      <ScanValueSelectorProvider blockName="probe">{sweep}</ScanValueSelectorProvider>
    ) : (
      sweep
    )
  );
  return { onChange };
}

// The selection atom is module-level, so one test's click would otherwise
// survive into the next.
beforeEach(() => {
  getDefaultStore().set(clearScanValueSelectionAtom);
});

/** Active index recorded for the block/param the tests render. */
function readSelection(): number | undefined {
  return getDefaultStore().get(scanValueSelectionAtom).probe?.origin_x;
}

describe('ParameterSweep value selection', () => {
  it('renders no eye outside a selector scope', () => {
    renderSweep([4100.223, 1100]);
    expect(screen.queryByRole('button', { name: /show value/i })).toBeNull();
  });

  it('renders one eye per value inside a scope, with the first active', () => {
    renderSweep([4100.223, 1100, 250], { withScope: true });
    const eyes = screen.getAllByRole('button', { name: /show value/i });
    expect(eyes).toHaveLength(3);
    expect(eyes.map((eye) => eye.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
  });

  it('makes only the clicked value active', () => {
    renderSweep([4100.223, 1100, 250], { withScope: true });
    fireEvent.click(screen.getByRole('button', { name: 'Show value 2 in the preview' }));
    const eyes = screen.getAllByRole('button', { name: /show value/i });
    expect(eyes.map((eye) => eye.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
  });

  it('offers no eye when the sweep holds a single value', () => {
    renderSweep([4100.223], { withScope: true });
    expect(screen.queryByRole('button', { name: /show value/i })).toBeNull();
  });

  it('activates the value that was just added', () => {
    const { onChange } = renderSweep([4100.223, 1100], { withScope: true });
    fireEvent.click(screen.getByRole('button', { name: 'Add a value' }));
    expect(onChange).toHaveBeenCalledWith([4100.223, 1100, null]);
    expect(readSelection()).toBe(2);
  });

  it('activates the second value when a single-value sweep grows', () => {
    renderSweep([4100.223], { withScope: true });
    fireEvent.click(screen.getByRole('button', { name: 'Add a value' }));
    expect(readSelection()).toBe(1);
  });

  it('keeps the eye on the same value when an earlier one is removed', () => {
    renderSweep([10, 20, 30], { withScope: true });
    fireEvent.click(screen.getByRole('button', { name: 'Show value 3 in the preview' }));
    // remove the first value → the active one slides down to index 1
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove this value' })[0]);
    expect(readSelection()).toBe(1);
  });

  it('falls back to the first value when the active one is removed', () => {
    renderSweep([10, 20, 30], { withScope: true });
    fireEvent.click(screen.getByRole('button', { name: 'Show value 2 in the preview' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove this value' })[1]);
    expect(readSelection()).toBe(0);
  });
});

describe('ParameterSweep layout', () => {
  it('leaves the collapse control to the field title row', () => {
    renderSweep([4100.223, 1100]);
    expect(screen.queryByRole('button', { name: 'Use a single value' })).toBeNull();
  });

  it('gives every row the same add/remove slots so the buttons line up', () => {
    renderSweep([4100.223, 1100]);
    const rows = [...document.querySelectorAll('.flex.w-full.items-center')];
    expect(rows).toHaveLength(2);
    // Only the last row shows "add", but both rows reserve the slot.
    for (const row of rows) {
      expect(row.querySelectorAll(':scope > span.size-6')).toHaveLength(2);
    }
    expect(
      within(rows[0] as HTMLElement).queryByRole('button', { name: 'Add a value' })
    ).toBeNull();
    expect(
      within(rows[1] as HTMLElement).getByRole('button', { name: 'Add a value' })
    ).toBeTruthy();
  });

  it('orders the row controls eye, delete, then add', () => {
    renderSweep([4100.223, 1100], { withScope: true });
    const lastRow = [...document.querySelectorAll('.flex.w-full.items-center')].at(
      -1
    ) as HTMLElement;
    const labels = [...lastRow.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Show value 2 in the preview', 'Remove this value', 'Add a value']);
  });
});

describe('sweepSingleValue', () => {
  it('collapses to the first usable value', () => {
    expect(sweepSingleValue([4100.223, 1100])).toBe(4100.223);
    expect(sweepSingleValue([null, 1100])).toBe(1100);
    expect(sweepSingleValue([null, null])).toBeNull();
    expect(sweepSingleValue(42)).toBe(42);
    expect(sweepSingleValue(null)).toBeNull();
  });
});
