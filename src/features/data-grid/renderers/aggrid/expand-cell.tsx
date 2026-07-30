import { RiArrowDownSLine, RiArrowRightSLine } from '@remixicon/react';

import { isDetailRow } from './detail-rows';
import { useGridState } from './use-grid-state';

import type { CustomCellRendererProps } from 'ag-grid-react';
import type { ReactNode } from 'react';
import type { GridController } from '../../core';
import type { DetailRuntime } from '../../react';
import type { AgGridContext } from './ag-context';

/**
 * The reusable expand/collapse toggle. Reads the expanded set from the headless
 * store, respects the detail provider's `canExpand`, and dispatches
 * `toggleExpanded` on click. Shared by the fixed leading {@link AgExpandCell} and
 * the in-column {@link AgExpandHostCell} so both placements behave identically.
 */
export function ExpandToggleButton<Row>({
  controller,
  detail,
  row,
  renderGlyph,
  fill = true,
}: {
  controller: GridController<Row>;
  detail?: DetailRuntime<Row>;
  row: unknown;
  /** custom glyph given the open state (default: chevron right/down). */
  renderGlyph?: (open: boolean) => ReactNode;
  /** center-fill the button (leading column); false keeps it inline (in-cell). */
  fill?: boolean;
}) {
  const state = useGridState(controller);

  if (row == null || isDetailRow(row)) return null;
  if (detail && !detail.provider.canExpand(row as Row)) return null;

  const rowId = controller.schema.getRowId(row as Row);
  const expanded = state.expanded.includes(rowId);

  return (
    <button
      type="button"
      aria-label={expanded ? 'Collapse row' : 'Expand row'}
      aria-expanded={expanded}
      className={
        fill
          ? 'flex h-full w-full items-center justify-center text-gray-500 hover:text-primary-7'
          : 'flex items-center justify-center text-gray-500 transition-colors hover:text-primary-7'
      }
      onClick={(e) => {
        e.stopPropagation();
        controller.store.dispatch({ type: 'toggleExpanded', id: rowId });
      }}
    >
      {renderGlyph ? (
        renderGlyph(expanded)
      ) : expanded ? (
        <RiArrowDownSLine size={16} />
      ) : (
        <RiArrowRightSLine size={16} />
      )}
    </button>
  );
}

/**
 * Expand/collapse chevron for rows with detail content. Dispatches
 * `toggleExpanded`; the renderer reacts by (de)interleaving the synthetic
 * full-width detail row. The fixed leading-column placement (default).
 */
export function AgExpandCell(props: CustomCellRendererProps) {
  const ctx = props.context as AgGridContext;
  return <ExpandToggleButton controller={ctx.controller} detail={ctx.detail} row={props.data} />;
}
