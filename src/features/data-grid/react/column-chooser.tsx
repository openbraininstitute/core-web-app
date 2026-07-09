import { RiLayoutColumnLine } from '@remixicon/react';
import { Checkbox, Popover } from 'antd';
import { useMemo } from 'react';

import { cn } from '@/utils/css-class';

import type { GridController, GridState } from '../core';

export interface ColumnChooserProps<Row> {
  controller: GridController<Row>;
  state: GridState;
  className?: string;
}

/**
 * Renderer-agnostic column visibility control: reads the resolved columns and the
 * `hiddenColumns` state, dispatches `setHiddenColumns`. The legacy "active columns"
 * feature, re-expressed against the new store.
 */
export function ColumnChooser<Row>({ controller, state, className }: ColumnChooserProps<Row>) {
  const columns = useMemo(() => controller.resolvedColumns(), [controller]);
  const hidden = useMemo(() => new Set(state.hiddenColumns), [state.hiddenColumns]);
  const value = columns.filter((c) => !hidden.has(c.id)).map((c) => c.id);

  const onChange = (checked: Array<string>) => {
    const checkedSet = new Set(checked);
    const nextHidden = columns.filter((c) => !checkedSet.has(c.id)).map((c) => c.id);
    controller.store.dispatch({ type: 'setHiddenColumns', hidden: nextHidden });
  };

  const content = (
    <Checkbox.Group
      value={value}
      onChange={(v) => onChange(v as Array<string>)}
      className="max-h-80 overflow-auto"
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
    <Popover trigger="click" placement="bottomRight" content={content}>
      <button
        type="button"
        aria-label="Choose columns"
        className={cn(
          'flex items-center gap-1 rounded-md px-2 py-1 text-sm text-primary-7 hover:bg-gray-100',
          className
        )}
      >
        <RiLayoutColumnLine size={16} />
        Columns
      </button>
    </Popover>
  );
}
