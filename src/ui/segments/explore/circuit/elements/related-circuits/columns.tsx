'use client';

import { useSetAtom } from 'jotai';

import { DownloadIcon } from '@/components/icons';
import { circuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/circuit';
import { Align } from '@/features/data-grid/core';
import { downloadPanelCircuitAtom } from '@/ui/segments/explore/circuit/elements/download-panel';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';

/** Per-row download action: opens the circuit download panel for its row. */
function DownloadCell({ circuit }: { circuit: ICircuit }) {
  const setDownloadPanelCircuit = useSetAtom(downloadPanelCircuitAtom);

  return (
    <button
      type="button"
      aria-label="Download circuit"
      title="Download"
      // The AG cell is `display:flex`, so without `shrink-0` this button is squeezed
      // narrower than it is tall and `rounded-full` reads as a rounded rectangle.
      className="flex size-7 shrink-0 items-center justify-center rounded-full text-primary-8 transition-colors hover:bg-primary-8 hover:text-white"
      onClick={(e) => {
        // keep the row-click handler from firing
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        setDownloadPanelCircuit(circuit);
      }}
    >
      {/* raw <button>, so no `[&_svg]:shrink-0` safety net from the Button molecule */}
      <DownloadIcon className="shrink-0 text-current" />
    </button>
  );
}

/**
 * Column set for every related-circuits table: the circuit schema columns plus a leading
 * per-row download action.
 *
 * `available` is stripped from each schema column: the contextual gate on Subcircuits would
 * drop it from the controller's `columnOrder`, and an id missing from that order sorts last.
 * These tables are always the subcircuit view, so every schema column is wanted here.
 */
export const RELATED_CIRCUIT_COLUMNS: ReadonlyArray<ISimpleColumn<ICircuit>> = [
  {
    id: '__download',
    header: '',
    align: Align.Center,
    // 28px button + the grid theme's 2 x 16px cell padding = 60px minimum
    width: { width: 64, minWidth: 64, resizable: false },
    renderCell: (row) => <DownloadCell circuit={row} />,
  },
  ...(circuitSchema.columns as ReadonlyArray<ISimpleColumn<ICircuit>>).map(
    ({ available: _available, ...column }) => column
  ),
];
