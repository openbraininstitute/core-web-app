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
 */
export function ColumnChooser<Row>({ controller, state, className }: IColumnChooserProps<Row>) {
  const columns = useMemo(() => controller.resolvedColumns(), [controller]);
  const hidden = useMemo(() => new Set(state.hiddenColumns), [state.hiddenColumns]);
  const value = columns.filter((c) => !hidden.has(c.id)).map((c) => c.id);

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
        {columns.map((c) => (
          <Checkbox key={c.id} value={c.id}>
            {c.header}
          </Checkbox>
        ))}
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
