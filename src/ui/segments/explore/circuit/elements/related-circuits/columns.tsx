'use client';

import { useSetAtom } from 'jotai';

import { DownloadIcon } from '@/components/icons';
import { circuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/circuit';
import { downloadPanelCircuitAtom } from '@/ui/segments/explore/circuit/elements/download-panel';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';

/**
 * Per-row download action for the related-circuits tables. These tables have no
 * toolbar/bulk actions (unlike the browse listing, where download is a bulk
 * action over the selection), so download stays per-row as in the legacy antd
 * tables — the button opens the circuit download panel for its row.
 */
function DownloadCell({ circuit }: { circuit: ICircuit }) {
  const setDownloadPanelCircuit = useSetAtom(downloadPanelCircuitAtom);

  return (
    <button
      type="button"
      aria-label="Download circuit"
      title="Download"
      className="flex size-7 items-center justify-center rounded-full text-primary-8 transition-colors hover:bg-primary-8 hover:text-white"
      onClick={(e) => {
        // belt-and-braces for ancestor grids; the grid itself also ignores clicks
        // originating from interactive elements (see InMemoryGrid onCellClicked).
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        setDownloadPanelCircuit(circuit);
      }}
    >
      <DownloadIcon className="text-current" />
    </button>
  );
}

/**
 * Column set for every related-circuits table (parent / root / derived-from /
 * subcircuits / derived): the SAME schema columns the Data → Circuit hierarchy
 * grid renders — so widths, headers, truncation and the in-cell expander column
 * are identical — plus the leading per-row download action.
 */
export const RELATED_CIRCUIT_COLUMNS: ReadonlyArray<SimpleColumn<ICircuit>> = [
  {
    id: '__download',
    header: '',
    width: { width: 48, minWidth: 48, resizable: false },
    renderCell: (row) => <DownloadCell circuit={row} />,
  },
  ...(circuitSchema.columns as ReadonlyArray<SimpleColumn<ICircuit>>),
];
