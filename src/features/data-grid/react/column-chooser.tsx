import { RiTable3 } from '@remixicon/react';
import { Checkbox, Popover } from 'antd';
import { useMemo } from 'react';

import {
  essentialColumnIds,
  GridActionType,
  isDefaultColumnLayout,
} from '@/features/data-grid/core';
import { ExpandingToolbarButton } from '@/features/data-grid/react/expanding-toolbar-button';
import { GRID_OVERLAY_Z_INDEX } from '@/features/data-grid/react/molecules-theme';
import { cn } from '@/utils/css-class';

import type { GridController, IGridState } from '@/features/data-grid/core';

export interface IColumnChooserProps<Row> {
  controller: GridController<Row>;
  state: IGridState;
  className?: string;
}

/**
 * Renderer-agnostic column visibility control: reads the resolved columns and
 * `hiddenColumns`, dispatches `setHiddenColumns`. Auxiliary columns are listed below a
 * separator; ticking one also moves its filter from the advanced-filters panel into its
 * column header (see `resolveFilterPanelGroups`) — one checkbox controls both.
 */
export function ColumnChooser<Row>({ controller, state, className }: IColumnChooserProps<Row>) {
  const columns = useMemo(() => controller.resolvedColumns(), [controller]);
  const hidden = useMemo(() => new Set(state.hiddenColumns), [state.hiddenColumns]);
  const value = columns.filter((c) => !hidden.has(c.id)).map((c) => c.id);
  /**
   * A column that has no header AND can never be hidden has nothing to offer here: its
   * checkbox would be blank and permanently disabled. An unnamed column the user CAN
   * hide still appears, blank label and all, rather than vanishing from their control.
   * Excluding a column from the list does not exclude it from `setVisible`, where
   * `alwaysVisible` is what actually keeps it on screen.
   */
  const listed = columns.filter((c) => c.header.trim() !== '' || !c.alwaysVisible);
  const regular = listed.filter((c) => !c.auxiliary);
  const auxiliary = listed.filter((c) => c.auxiliary);

  const setVisible = (visibleIds: Array<string>) => {
    const visible = new Set(visibleIds);
    const nextHidden = columns
      .filter((c) => !visible.has(c.id) && !c.alwaysVisible)
      .map((c) => c.id);
    controller.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: nextHidden });
  };

  const allVisible = columns.length > 0 && value.length === columns.length;
  const noneVisible = value.length === 0;
  const mixed = !allVisible && !noneVisible;

  /**
   * Unticking "Select all" keeps the essential columns visible rather than emptying the
   * grid. Binds the bulk action only — an essential column's own checkbox still hides it.
   * The tri-state still reports actual visibility, so a bulk deselect reads indeterminate.
   */
  const onToggleAll = (checked: boolean) => {
    setVisible(checked ? columns.map((c) => c.id) : essentialColumnIds(columns));
  };

  const atDefaults = isDefaultColumnLayout(columns, state);

  const separator = <hr className="my-2 border-t border-gray-100" />;

  const content = (
    <div
      className={cn(
        'max-h-80 overflow-auto',
        // checked state uses primary-9 (not antd's default blue)
        '[&_.ant-checkbox-checked_.ant-checkbox-inner]:border-primary-9! [&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-9!',
        '[&_.ant-checkbox-checked:after]:border-primary-9! [&_.ant-checkbox:hover_.ant-checkbox-inner]:border-primary-9!',
        '[&_.ant-checkbox-indeterminate_.ant-checkbox-inner:after]:bg-primary-9!',
        // the override above also paints the DISABLED checked box primary-9 while antd
        // keeps the tick its grey disabled colour — dark on dark, i.e. invisible. Same
        // treatment as the scan-config selection lists: lighter fill, white tick.
        '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-6!',
        '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:border-primary-6!',
        '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:after:border-white!'
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <Checkbox
            checked={allVisible}
            indeterminate={mixed}
            // antd draws the mixed state but sets no ARIA for it, so a screen reader would
            // hear "unchecked" for a partially-selected list
            aria-checked={mixed ? 'mixed' : allVisible}
            onChange={(e) => onToggleAll(e.target.checked)}
          >
            Select all
          </Checkbox>
          <button
            type="button"
            disabled={atDefaults}
            onClick={() => controller.resetColumnLayout()}
            className={cn(
              'shrink-0 text-xs font-medium underline-offset-2',
              atDefaults
                ? 'cursor-not-allowed text-gray-300'
                : 'text-primary-6 hover:text-primary-8 hover:underline'
            )}
          >
            Reset to default
          </button>
        </div>
        {separator}
        {/* select-all is outside the group: it is not one of the values */}
        <Checkbox.Group
          value={value}
          onChange={(v) => setVisible(v as Array<string>)}
          className="flex flex-col gap-1"
        >
          {regular.map((c) => (
            <Checkbox key={c.id} value={c.id} disabled={c.alwaysVisible}>
              {c.header}
            </Checkbox>
          ))}
          {auxiliary.length > 0 ? (
            <>
              {/* `<hr>` carries the implicit `separator` role, so the break is announced */}
              {separator}
              {auxiliary.map((c) => (
                <Checkbox key={c.id} value={c.id} disabled={c.alwaysVisible}>
                  {c.header}
                </Checkbox>
              ))}
            </>
          ) : null}
        </Checkbox.Group>
      </div>
    </div>
  );

  return (
    // `zIndex` pinned rather than antd's 1030, so every grid overlay shares one rank
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
