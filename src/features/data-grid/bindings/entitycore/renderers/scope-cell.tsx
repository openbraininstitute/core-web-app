'use client';

import { GlobalOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';

import {
  SCOPE_LABELS,
  ScopeTooltip,
} from '@/features/data-grid/bindings/entitycore/renderers/scope-tooltip';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';
import { projectScopeIconFlag, useFlag } from '@/features/feature-flags';
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

/** A globe with a person badge: the project's own data, made public. */
function GlobeWithProjectBadge({ muted }: { muted?: boolean }) {
  return (
    <svg
      role="img"
      aria-label={SCOPE_LABELS.published}
      viewBox="0 0 24 24"
      width="1.2em"
      height="1.2em"
      fill="none"
    >
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="10" cy="10" r="7.7" />
        <ellipse cx="10" cy="10" rx="3.3" ry="7.7" />
        <path d="M2.3 10h15.4" />
      </g>
      {/* the ring cuts the badge out of the globe */}
      <circle cx="16.5" cy="16.5" r="7.5" className="fill-white" />
      <circle cx="16.5" cy="16.5" r="6.5" className={muted ? 'fill-gray-300' : 'fill-primary-4'} />
      <circle cx="16.5" cy="14.2" r="2.2" fill="white" />
      <path d="M12.4 21c.4-2.4 2-3.6 4.1-3.6s3.7 1.2 4.1 3.6z" fill="white" />
    </svg>
  );
}

/**
 * A globe, people, or for the project's made-public data a globe with a person
 * badge; `muted` leaves the colour to the parent. Colours sit
 * on wrappers: on the icon itself a colour class ties with antd's `.anticon { color:
 * inherit }`, and whichever stylesheet loaded last wins.
 */
export function ScopeMark({ kind, muted }: { kind: TScopeKind; muted?: boolean }) {
  const ProjectIcon = useProjectScopeIcon();
  const tint = (scope: keyof typeof SCOPE_COLORS) =>
    cn('inline-flex', !muted && SCOPE_COLORS[scope]);
  if (kind === 'published') {
    return (
      <span className={tint('public')}>
        <GlobeWithProjectBadge muted={muted} />
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
    <span className={tint('project')}>
      <ProjectIcon aria-label={SCOPE_LABELS[kind]} />
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
    <span className="flex h-full items-center justify-center text-lg">
      {/* the icon is the trigger, so the card hangs from it and not from the cell's edge */}
      <ScopeTooltip kind={kind} delayDuration={200}>
        <span data-testid={`scope-cell-${kind}`} className="inline-flex">
          <ScopeMark kind={kind} />
        </span>
      </ScopeTooltip>
    </span>
  );
}
