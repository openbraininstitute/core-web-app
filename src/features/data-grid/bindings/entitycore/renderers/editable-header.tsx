'use client';

import { LockOutlined } from '@ant-design/icons';

import { EditIcon } from '@/features/data-grid/bindings/entitycore/renderers/editable-cell';
import { LightTooltip } from '@/features/data-grid/bindings/entitycore/renderers/light-tooltip';
import { FilterValueKind, GridActionType, OperatorId } from '@/features/data-grid/core';
import { useGridState } from '@/features/data-grid/react/use-grid-state';
import { cn } from '@/utils/css-class';

import type { IHeaderRendererProps } from '@/features/data-grid/react';

/** Header-renderer registry key for the editable / read-only toggles. */
export const EDITABLE_HEADER_RENDERER = 'editableHeader';

/** The editable column's filter values, and what each one shows. */
export const EditableFilter = {
  /** the records of this project, public or not */
  Editable: 'editable',
  /** public records of other projects */
  ReadOnly: 'read-only',
} as const;

const SIDES = [
  {
    value: EditableFilter.Editable,
    label: 'Editable',
    hint: "Editable: this project's data",
    tint: 'text-primary-4',
  },
  {
    value: EditableFilter.ReadOnly,
    label: 'Read-only',
    hint: 'Read-only: public data from other projects',
    tint: 'text-gray-500',
  },
] as const;

/**
 * A person-with-pencil and a lock toggle in place of the column's label: coloured when its
 * rows are shown, grey when not. Both on (the default) filters nothing, one on keeps only
 * those rows, and the last one on stays on.
 */
export function EditableHeader({ columnId, ctx }: IHeaderRendererProps) {
  const state = useGridState(ctx.controller);
  const entry = state.filters[columnId];
  const only = entry?.value.kind === FilterValueKind.Text ? entry.value.text : undefined;

  const show = (value: string | undefined) =>
    ctx.controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId,
      entry: value
        ? {
            columnId,
            operator: OperatorId.Eq,
            value: { kind: FilterValueKind.Text, text: value },
          }
        : null,
    });

  return (
    <div className="flex h-full w-full items-center justify-center gap-0.5">
      {SIDES.map(({ value, label, hint, tint }) => {
        const isOn = !only || only === value;
        const isLast = only === value;
        return (
          <LightTooltip key={value} label={hint}>
            <button
              type="button"
              aria-pressed={isOn}
              aria-disabled={isLast}
              aria-label={label}
              data-testid={`editable-header-${value}`}
              onClick={() => {
                if (isLast) return;
                // switching one off keeps the other; switching it back on shows both
                show(isOn ? SIDES.find((s) => s.value !== value)?.value : undefined);
              }}
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-base transition-colors',
                'focus-visible:ring-primary-6 outline-none focus-visible:ring-2',
                isOn ? tint : 'text-gray-300 hover:text-gray-500',
                isLast ? 'cursor-default' : 'hover:bg-gray-100'
              )}
            >
              {value === EditableFilter.Editable ? <EditIcon /> : <LockOutlined aria-hidden />}
            </button>
          </LightTooltip>
        );
      })}
    </div>
  );
}
