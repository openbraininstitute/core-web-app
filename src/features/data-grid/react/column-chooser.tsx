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
 * A tri-state "Select all" heads the list, above its own hairline separator; it
 * writes the same `hiddenColumns` state as the per-column checkboxes, so one click
 * reveals every auxiliary column and the next collapses back.
 *
 * AUXILIARY columns are listed apart, below a hairline separator: they are backend-
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

  const setVisible = (visibleIds: Array<string>) => {
    const visible = new Set(visibleIds);
    const nextHidden = columns.filter((c) => !visible.has(c.id)).map((c) => c.id);
    controller.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: nextHidden });
  };

  const allVisible = columns.length > 0 && value.length === columns.length;
  const noneVisible = value.length === 0;
  const mixed = !allVisible && !noneVisible;

  /**
   * EMPTY-GRID GUARD: unticking "Select all" keeps the FIRST column visible rather
   * than hiding everything — a grid with no columns is not a state a user can
   * recover from through this popover, and disabling the control instead would make
   * the one-click collapse (the whole point of the toggle) unreachable exactly when
   * it is most useful. The toggle therefore cycles all ⇄ first-only, and the
   * first-only state renders honestly as INDETERMINATE, not unchecked.
   */
  const onToggleAll = (checked: boolean) => {
    setVisible(checked ? columns.map((c) => c.id) : columns.slice(0, 1).map((c) => c.id));
  };

  const separator = <hr className="my-2 border-t border-gray-100" />;

  const content = (
    <div
      className={cn(
        'max-h-80 overflow-auto',
        // checked state uses primary-9 (not antd's default blue)
        '[&_.ant-checkbox-checked_.ant-checkbox-inner]:border-primary-9! [&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-9!',
        '[&_.ant-checkbox-checked:after]:border-primary-9! [&_.ant-checkbox:hover_.ant-checkbox-inner]:border-primary-9!',
        '[&_.ant-checkbox-indeterminate_.ant-checkbox-inner:after]:bg-primary-9!'
      )}
    >
      <div className="flex flex-col gap-1">
        <Checkbox
          checked={allVisible}
          indeterminate={mixed}
          // antd renders the mixed state VISUALLY (the dash) but sets no ARIA for it,
          // and a native checkbox input has no `mixed` value — so the tri-state has to
          // be announced explicitly or a screen reader hears "unchecked" for a
          // partially-selected list.
          aria-checked={mixed ? 'mixed' : allVisible}
          onChange={(e) => onToggleAll(e.target.checked)}
        >
          Select all
        </Checkbox>
        {separator}
        {/*
          The per-column group starts BELOW the select-all: that control is not one of
          the values, it writes the same `hiddenColumns` state from the outside.
        */}
        <Checkbox.Group
          value={value}
          onChange={(v) => setVisible(v as Array<string>)}
          className="flex flex-col gap-1"
        >
          {regular.map((c) => (
            <Checkbox key={c.id} value={c.id}>
              {c.header}
            </Checkbox>
          ))}
          {auxiliary.length > 0 ? (
            <>
              {/*
                A hairline, not a label: the auxiliary columns are ordinary checkboxes
                that happen to be opt-in, and naming the section made the chooser read
                as two features. An `<hr>` carries the implicit `separator` role, so
                the break is still announced without an ARIA opt-in.
              */}
              {separator}
              {auxiliary.map((c) => (
                <Checkbox key={c.id} value={c.id}>
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
