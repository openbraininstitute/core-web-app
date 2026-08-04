import { RiTable3 } from '@remixicon/react';
import { Checkbox, Popover } from 'antd';
import { useMemo } from 'react';

import { cn } from '@/utils/css-class';

import { GridActionType } from '../core';
import { ExpandingToolbarButton } from './expanding-toolbar-button';
import { GRID_OVERLAY_Z_INDEX } from './molecules-theme';

import type { GridController, IGridState } from '../core';

export interface IColumnChooserProps<Row> {
  controller: GridController<Row>;
  state: IGridState;
  className?: string;
}

/**
 * Renderer-agnostic column visibility control: reads the resolved columns and the
 * `hiddenColumns` state, dispatches `setHiddenColumns`. The legacy "active columns"
 * feature, re-expressed against the new store.
 *
 * AUXILIARY columns are listed apart, under "More columns": they are backend-
 * filterable fields the grid CAN show but does not by default, and folding them into
 * the main list would bury the columns the grid is actually about. Ticking one also
 * moves its filter out of the advanced-filters panel and into its column header (see
 * `resolveFilterPanelGroups`) — the checkbox is the single control for both.
 */
export function ColumnChooser<Row>({ controller, state, className }: IColumnChooserProps<Row>) {
  const columns = useMemo(() => controller.resolvedColumns(), [controller]);
  const hidden = useMemo(() => new Set(state.hiddenColumns), [state.hiddenColumns]);
  const value = columns.filter((c) => !hidden.has(c.id)).map((c) => c.id);
  const regular = columns.filter((c) => !c.auxiliary);
  const auxiliary = columns.filter((c) => c.auxiliary);

  const onChange = (checked: Array<string>) => {
    const checkedSet = new Set(checked);
    const nextHidden = columns.filter((c) => !checkedSet.has(c.id)).map((c) => c.id);
    controller.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: nextHidden });
  };

  const content = (
    <Checkbox.Group
      value={value}
      onChange={(v) => onChange(v as Array<string>)}
      className={cn(
        'max-h-80 overflow-auto',
        // checked state uses primary-9 (not antd's default blue)
        '[&_.ant-checkbox-checked_.ant-checkbox-inner]:border-primary-9! [&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-9!',
        '[&_.ant-checkbox-checked:after]:border-primary-9! [&_.ant-checkbox:hover_.ant-checkbox-inner]:border-primary-9!'
      )}
    >
      <div className="flex flex-col gap-1">
        {regular.map((c) => (
          <Checkbox key={c.id} value={c.id}>
            {c.header}
          </Checkbox>
        ))}
        {auxiliary.length > 0 ? (
          <>
            <span className="mt-2 border-t border-gray-100 px-0.5 pt-2 text-[11px] font-bold uppercase tracking-wide text-primary-8">
              More columns
            </span>
            {auxiliary.map((c) => (
              <Checkbox key={c.id} value={c.id}>
                {c.header}
              </Checkbox>
            ))}
          </>
        ) : null}
      </div>
    </Checkbox.Group>
  );

  return (
    // `zIndex` is PINNED, not left to antd's default (1030): the grid renders inside
    // `ui/molecules/modal` too, whose dialog sits at 1001. One number for every grid
    // overlay keeps the chooser and the filters popover on the same rank.
    <Popover
      trigger="click"
      placement="bottomRight"
      content={content}
      zIndex={GRID_OVERLAY_Z_INDEX}
    >
      <ExpandingToolbarButton icon={<RiTable3 size={18} />} label="Columns" className={className} />
    </Popover>
  );
}
