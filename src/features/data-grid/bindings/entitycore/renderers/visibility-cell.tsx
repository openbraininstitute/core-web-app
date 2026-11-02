'use client';

import { ScopeMark } from '@/features/data-grid/bindings/entitycore/renderers/scope-cell';
import { ScopeTooltip } from '@/features/data-grid/bindings/entitycore/renderers/scope-tooltip';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';

import type { ReactNode } from 'react';
import type { ICellRendererProps } from '@/features/data-grid/react';

/** Cell-renderer registry key for the public / project mark. */
export const VISIBILITY_RENDERER = 'visibility';

interface IVisibilityRow {
  authorized_public?: boolean | null;
}

/** A globe for a public record, people for one private to a project. Ownership is the next column. */
export function VisibilityCell({ row }: ICellRendererProps<IVisibilityRow>): ReactNode | null {
  if (typeof row?.authorized_public !== 'boolean') return EMPTY_PLACEHOLDER;
  const kind = row.authorized_public ? 'public' : 'project';
  return (
    <span className="flex h-full items-center justify-center text-lg">
      {/* the icon is the trigger, so the card hangs from it and not from the cell's edge */}
      <ScopeTooltip kind={kind} delayDuration={200}>
        <span data-testid={`visibility-cell-${kind}`} className="inline-flex">
          <ScopeMark kind={kind} />
        </span>
      </ScopeTooltip>
    </span>
  );
}
