import { RiArrowDownSLine, RiArrowRightSLine } from '@remixicon/react';

import { cn } from '@/utils/css-class';

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
      // marks this control so grids' `onCellClicked` ignore the click (no row-open /
      // mini-detail). Nested grids bubble the native click up to ancestor grids, so
      // every grid checks for this attribute — see `isExpanderClick`.
      data-grid-expander=""
      aria-label={expanded ? 'Collapse row' : 'Expand row'}
      aria-expanded={expanded}
      className={cn(
        // fully-rounded icon button; on hover/focus it fills primary-8 with a white glyph
        'flex items-center justify-center rounded-full text-gray-500 outline-none transition-colors',
        'hover:bg-primary-8 hover:text-white focus-visible:bg-primary-8 focus-visible:text-white',
        fill ? 'size-7' : 'size-6'
      )}
      onClick={(e) => {
        // stop React + native bubbling so a click on a DEEP grid's expander never
        // reaches an ancestor grid (which would otherwise open/collapse a parent row).
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
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
 * True when a grid click originated on an expand/collapse toggle (marked with
 * `data-grid-expander`). A grid's `onCellClicked` uses this to skip row-open /
 * mini-detail for expander clicks — including clicks that bubbled up from a nested
 * grid's expander (which is why the ancestor grid must check too).
 */
export function isExpanderClick(event: Event | null | undefined): boolean {
  const target = event?.target;
  return target instanceof Element && Boolean(target.closest('[data-grid-expander]'));
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
