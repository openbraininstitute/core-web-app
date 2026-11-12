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
  value: number | null | (number | null)[],
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

  it('puts remove in every row and add in the last row only', () => {
    renderSweep([4100.223, 1100]);
    const rows = [...document.querySelectorAll('.flex.w-full.items-center')];
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(
        within(row as HTMLElement).getByRole('button', { name: 'Remove this value' })
      ).toBeTruthy();
    }
    expect(
      within(rows[0] as HTMLElement).queryByRole('button', { name: 'Add a value' })
    ).toBeNull();
    expect(
      within(rows[1] as HTMLElement).getByRole('button', { name: 'Add a value' })
    ).toBeTruthy();
  });

  it('keeps add and remove inside the field, with the eye after it', () => {
    renderSweep([4100.223, 1100], { withScope: true });
    const lastRow = [...document.querySelectorAll('.flex.w-full.items-center')].at(
      -1
    ) as HTMLElement;
    const labels = [...lastRow.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
    // remove stays at the field's right edge so it lines up on every row
    expect(labels).toEqual(['Add a value', 'Remove this value', 'Show value 2 in the preview']);
    const field = lastRow.querySelector('.relative') as HTMLElement;
    expect(within(field).getByRole('button', { name: 'Add a value' })).toBeTruthy();
    expect(within(field).getByRole('button', { name: 'Remove this value' })).toBeTruthy();
    expect(within(field).queryByRole('button', { name: /show value/i })).toBeNull();
  });
});

describe('ParameterSweep single value and back', () => {
  it('opens a scan with an empty second value', () => {
    const { onChange } = renderSweep(5);
    fireEvent.click(screen.getByRole('button', { name: 'Scan over several values' }));
    expect(onChange).toHaveBeenCalledWith([5, null]);
  });

  it('returns to a single value when only one is left', () => {
    const { onChange } = renderSweep([10, 20]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove this value' })[0]);
    expect(onChange).toHaveBeenCalledWith(20);
  });

  it('stays a scan while two or more values are left', () => {
    const { onChange } = renderSweep([10, 20, 30]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove this value' })[0]);
    expect(onChange).toHaveBeenCalledWith([20, 30]);
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
