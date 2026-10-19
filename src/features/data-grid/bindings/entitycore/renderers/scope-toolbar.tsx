'use client';

import { GlobalOutlined } from '@ant-design/icons';

import {
  SCOPE_COLORS,
  useProjectScopeIcon,
} from '@/features/data-grid/bindings/entitycore/renderers/scope-cell';
import {
  TOGGLES,
  useScopeSides,
} from '@/features/data-grid/bindings/entitycore/renderers/scope-header';
import { ScopeTooltip } from '@/features/data-grid/bindings/entitycore/renderers/scope-tooltip';
import { SCOPE_COLUMN_ID } from '@/features/data-grid/bindings/entitycore/scope-filter';
import { cn } from '@/utils/css-class';

import type { GridController } from '@/features/data-grid/core';

/**
 * The globe and the people again, round, beside the search: the same choice as the scope
 * column's header, kept in step with it through the column's filter.
 */
export function ScopeToolbarToggles<Row>({ controller }: { controller: GridController<Row> }) {
  const ProjectIcon = useProjectScopeIcon();
  const { view, choose } = useScopeSides(controller, SCOPE_COLUMN_ID);
  return (
    <div className="flex items-center gap-1.5" data-testid="scope-toolbar">
      {TOGGLES.map(({ kind, other, label }) => {
        const isOn = view.side !== other;
        const Icon = kind === 'public' ? GlobalOutlined : ProjectIcon;
        return (
          <ScopeTooltip key={kind} kind={kind}>
            <button
              type="button"
              aria-pressed={isOn}
              data-testid={`scope-toolbar-${kind}`}
              onClick={() => choose(kind)}
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[18px]',
                'transition-[transform,color,box-shadow] duration-150 ease-out hover:scale-105 active:scale-95',
                'focus-visible:ring-primary-6 outline-none focus-visible:ring-2',
                isOn ? cn('shadow-sm', SCOPE_COLORS[kind]) : 'text-gray-300 hover:text-gray-500'
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
