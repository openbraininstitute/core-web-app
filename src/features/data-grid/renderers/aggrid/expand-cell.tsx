import { RiArrowDownSLine, RiArrowRightSLine } from '@remixicon/react';

import { cn } from '@/utils/css-class';

import { GridActionType } from '../../core';
import { useGridState } from '../../react/use-grid-state';
import { isDetailRow } from './detail-rows';

import type { CustomCellRendererProps } from 'ag-grid-react';
import type { ReactNode } from 'react';
import type { GridController } from '../../core';
import type { IDetailRuntime } from '../../react';
import type { IAgGridContext } from './ag-context';

/**
 * The expand/collapse toggle, shared by the leading {@link AgExpandCell} and the
 * in-column {@link AgExpandHostCell} so both placements behave identically.
 */
export function ExpandToggleButton<Row>({
  controller,
  detail,
  row,
  renderGlyph,
  fill = true,
}: {
  controller: GridController<Row>;
  detail?: IDetailRuntime<Row>;
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
      // makes `onCellClicked` skip this click; nested grids bubble up, so EVERY ancestor
      // grid checks for this attribute — see `isExpanderClick`
      data-grid-expander=""
      aria-label={expanded ? 'Collapse row' : 'Expand row'}
      aria-expanded={expanded}
      className={cn(
        // CSS `fill` on the svg, not `text-white`: it must beat the icon's own
        // `fill="currentColor"` attribute and AG-cell colour inheritance
        'flex items-center justify-center rounded-full text-gray-500 outline-none transition-colors',
        'hover:bg-primary-8 focus-visible:bg-primary-8',
        '[&_svg]:transition-colors [&:hover_svg]:fill-white [&:focus-visible_svg]:fill-white',
        fill ? 'size-7' : 'size-6'
      )}
      onClick={(e) => {
        // stop React AND native bubbling, or a nested grid's expander toggles a parent row
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        controller.store.dispatch({ type: GridActionType.ToggleExpanded, id: rowId });
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
 * True when a grid click originated on an expand/collapse toggle, including one that
 * bubbled up from a nested grid — which is why every ancestor grid must check.
 */
export function isExpanderClick(event: Event | null | undefined): boolean {
  const target = event?.target;
  return target instanceof Element && Boolean(target.closest('[data-grid-expander]'));
}

/** Expand/collapse chevron in the fixed leading column (the default placement). */
export function AgExpandCell(props: CustomCellRendererProps) {
  const ctx = props.context as IAgGridContext;
  return <ExpandToggleButton controller={ctx.controller} detail={ctx.detail} row={props.data} />;
}
