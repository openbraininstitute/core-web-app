'use client';

import { GlobalOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';

import {
  SCOPE_LABELS,
  ScopeTooltip,
} from '@/features/data-grid/bindings/entitycore/renderers/scope-tooltip';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';
import { projectScopeIconFlag, scopeMarksFlag, useFlag } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { TScopeKind } from '@/features/data-grid/bindings/entitycore/scope-filter';
import type { ICellRendererProps } from '@/features/data-grid/react';

/** Cell-renderer registry key for the public/project scope icon. */
export const SCOPE_RENDERER = 'scope';

/** One colour per scope, shared by the cells and the header toggles. */
export const SCOPE_COLORS = { public: 'text-green-600', project: 'text-primary-4' } as const;

interface IScopeRow {
  authorized_public?: boolean | null;
  authorized_project_id?: string | null;
}

/** The project mark: two people, or one while the `project-scope-icon` flag says so. */
export function useProjectScopeIcon() {
  return useFlag(projectScopeIconFlag.key) === 'one' ? UserOutlined : TeamOutlined;
}

/**
 * Which design the scope marks use: both icons with a filter button for one side or a
 * sortable column, or a badged icon.
 */
export function useScopeMarks() {
  const marks = useFlag(scopeMarksFlag.key);
  return marks === 'badge' || marks === 'sort' ? marks : 'filter';
}

/**
 * A globe, people, or for the project's made-public data either both side by side or
 * people with a globe at their foot; `muted` leaves the colour to the parent. Colours sit
 * on wrappers: on the icon itself a colour class ties with antd's `.anticon { color:
 * inherit }`, and whichever stylesheet loaded last wins.
 */
export function ScopeMark({ kind, muted }: { kind: TScopeKind; muted?: boolean }) {
  const ProjectIcon = useProjectScopeIcon();
  const marks = useScopeMarks();
  const tint = (scope: keyof typeof SCOPE_COLORS) =>
    cn('inline-flex', !muted && SCOPE_COLORS[scope]);
  if (kind === 'published' && marks !== 'badge') {
    return (
      <span aria-label={SCOPE_LABELS.published} role="img" className="inline-flex gap-1">
        <span className={tint('public')}>
          <GlobalOutlined aria-hidden />
        </span>
        <span className={tint('project')}>
          <ProjectIcon aria-hidden />
        </span>
      </span>
    );
  }
  if (kind === 'public') {
    return (
      <span className={tint('public')}>
        <GlobalOutlined aria-label={SCOPE_LABELS.public} />
      </span>
    );
  }
  return (
    <span className={cn('relative', tint('project'))}>
      <ProjectIcon aria-label={SCOPE_LABELS[kind]} />
      {kind === 'published' && (
        <span
          className={cn(
            'absolute -bottom-0.5 -left-1 rounded-full bg-white p-px text-[0.55em]',
            tint('public')
          )}
        >
          <GlobalOutlined aria-hidden />
        </span>
      )}
    </span>
  );
}

/** Which mark a row gets: only the project's own records come back private. */
export function scopeKindOf(row: IScopeRow, projectId?: string): TScopeKind | null {
  if (typeof row.authorized_public !== 'boolean') return null;
  if (!row.authorized_public) return 'project';
  return projectId && row.authorized_project_id === projectId ? 'published' : 'public';
}

export function ScopeCell({ row }: ICellRendererProps<IScopeRow>): ReactNode | null {
  const { projectId } = useWorkspace();
  const kind = row && scopeKindOf(row, projectId);
  if (!kind) return EMPTY_PLACEHOLDER;
  return (
    // to the side and a beat late, so sweeping down the column does not flash one per row
    <ScopeTooltip kind={kind} side="right" delayDuration={200}>
      <span
        data-testid={`scope-cell-${kind}`}
        className="flex h-full items-center justify-center text-lg"
      >
        <ScopeMark kind={kind} />
      </span>
    </ScopeTooltip>
  );
}
