'use client';

import { GlobalOutlined } from '@ant-design/icons';

import {
  SCOPE_COLORS,
  useProjectScopeIcon,
} from '@/features/data-grid/bindings/entitycore/renderers/scope-cell';
import { ScopeTooltip } from '@/features/data-grid/bindings/entitycore/renderers/scope-tooltip';
import { FilterValueKind, GridActionType, OperatorId } from '@/features/data-grid/core';
import { useGridState } from '@/features/data-grid/react/use-grid-state';
import { cn } from '@/utils/css-class';

import type { IHeaderRendererProps } from '@/features/data-grid/react';

/** Header-renderer registry key for the public / project toggles. */
export const VISIBILITY_HEADER_RENDERER = 'visibilityHeader';

/** `authorized_public` values, as the column's Eq filter sends them. */
const SIDES = [
  { value: 'true', kind: 'public', label: 'Public' },
  { value: 'false', kind: 'project', label: 'Project' },
] as const;

/**
 * A globe and a people toggle in place of the column's label: coloured when its rows are
 * shown, grey when not. Both on (the default) filters nothing, one on keeps only those
 * rows through a plain `authorized_public` filter, and the last one on stays on.
 */
export function VisibilityHeader({ columnId, ctx }: IHeaderRendererProps) {
  const ProjectIcon = useProjectScopeIcon();
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
      {SIDES.map(({ value, kind, label }) => {
        const Icon = kind === 'public' ? GlobalOutlined : ProjectIcon;
        const isOn = !only || only === value;
        const isLast = only === value;
        return (
          <ScopeTooltip key={value} kind={kind} canChangeProject>
            <button
              type="button"
              aria-pressed={isOn}
              aria-disabled={isLast}
              data-testid={`visibility-header-${kind}`}
              onClick={() => {
                if (isLast) return;
                // switching one off keeps the other; switching it back on shows both
                show(isOn ? SIDES.find((s) => s.value !== value)?.value : undefined);
              }}
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-base transition-colors',
                'focus-visible:ring-primary-6 outline-none focus-visible:ring-2',
                isOn ? SCOPE_COLORS[kind] : 'text-gray-300 hover:text-gray-500',
                isLast ? 'cursor-default' : 'hover:bg-gray-100'
              )}
            >
              <Icon aria-label={label} />
            </button>
          </ScopeTooltip>
        );
      })}
    </div>
  );
}
