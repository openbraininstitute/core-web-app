'use client';

import { useSetAtom } from 'jotai';

import { DownloadIcon } from '@/components/icons';
import { circuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/circuit';
import { Align } from '@/features/data-grid/core';
import { downloadPanelCircuitAtom } from '@/ui/segments/explore/circuit/elements/download-panel';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';

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
      // The AG cell is `display:flex` (IM_DEFAULT_COL_DEF), so this button is a flex
      // ITEM: without `shrink-0` it is squeezed narrower than it is tall by a column
      // too narrow for 28px + the theme's 2x16px cell padding, and `rounded-full`
      // then reads as a rounded rectangle. `shrink-0` pins the square that makes the
      // circle a circle; the column width below reserves the room it needs.
      className="flex size-7 shrink-0 items-center justify-center rounded-full text-primary-8 transition-colors hover:bg-primary-8 hover:text-white"
      onClick={(e) => {
        // belt-and-braces for ancestor grids; the grid itself also ignores clicks
        // originating from interactive elements (see InMemoryGrid onCellClicked).
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        setDownloadPanelCircuit(circuit);
      }}
    >
      {/* `shrink-0`: this is a raw <button>, so it has none of the `Button` molecule's
          `[&_svg]:shrink-0` safety net and the glyph would squash with the box. */}
      <DownloadIcon className="shrink-0 text-current" />
    </button>
  );
}

/**
 * Column set for every related-circuits table (parent / root / derived-from /
 * subcircuits / derived): the SAME schema columns the Data → Circuit hierarchy
 * grid renders — so widths, headers, truncation and the in-cell expander column
 * are identical — plus the leading per-row download action.
 */
export const RELATED_CIRCUIT_COLUMNS: ReadonlyArray<ISimpleColumn<ICircuit>> = [
  {
    id: '__download',
    header: '',
    align: Align.Center,
    // 28px button + the grid theme's 2 x 16px cell padding = 60px minimum; anything
    // narrower squeezes the (now non-shrinking) circle against the cell edges.
    width: { width: 64, minWidth: 64, resizable: false },
    renderCell: (row) => <DownloadCell circuit={row} />,
  },
  ...(circuitSchema.columns as ReadonlyArray<ISimpleColumn<ICircuit>>),
];
