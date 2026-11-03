'use client';

import {
  SCOPE_COLORS,
  ScopeMark,
} from '@/features/data-grid/bindings/entitycore/renderers/scope-cell';
import {
  SCOPE_LABELS,
  ScopeTooltip,
} from '@/features/data-grid/bindings/entitycore/renderers/scope-tooltip';
import {
  SCOPE_KINDS,
  shownBy,
  showScope,
  toggled,
} from '@/features/data-grid/bindings/entitycore/scope-filter';
import { FilterValueKind } from '@/features/data-grid/core';
import { useGridState } from '@/features/data-grid/react/use-grid-state';
import { cn } from '@/utils/css-class';

import type { TScopeKind } from '@/features/data-grid/bindings/entitycore/scope-filter';
import type { IHeaderRendererProps } from '@/features/data-grid/react';

/** Header-renderer registry key for the scope toggles. */
export const SCOPE_HEADER_RENDERER = 'scopeHeader';

/**
 * A toggle per kind of row, and no more than these three, in place of the scope column's
 * label and filter: the globe for public data from other projects, the people for the
 * project's private data, and the globe with a badge for the project's data made public.
 * Each is coloured when its rows are shown and grey when not. All on (the default) filters
 * nothing, and a click then keeps only that kind.
 */
export function ScopeHeader({ columnId, ctx }: IHeaderRendererProps) {
  const state = useGridState(ctx.controller);
  const entry = state.filters[columnId];
  const shown = shownBy(entry?.value.kind === FilterValueKind.Text ? entry.value.text : '');
  const show = (kinds: Set<TScopeKind>) => showScope(ctx.controller, columnId, kinds);
  return (
    <div className="flex h-full w-full items-center justify-center gap-0.5">
      {SCOPE_KINDS.map((kind) => {
        const isOn = shown.has(kind);
        return (
          <ScopeTooltip key={kind} kind={kind} canChangeProject>
            <button
              type="button"
              aria-pressed={isOn}
              aria-label={SCOPE_LABELS[kind]}
              data-testid={`scope-header-${kind}`}
              onClick={() => show(toggled(shown, kind))}
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-lg transition-colors',
                'focus-visible:ring-primary-6 outline-none focus-visible:ring-2',
                isOn
                  ? kind === 'public'
                    ? SCOPE_COLORS.public
                    : SCOPE_COLORS.project
                  : 'text-gray-300 hover:text-gray-500',
                'hover:bg-gray-100'
              )}
            >
              <ScopeMark kind={kind} muted={!isOn} />
            </button>
          </ScopeTooltip>
        );
      })}
    </div>
  );
}
