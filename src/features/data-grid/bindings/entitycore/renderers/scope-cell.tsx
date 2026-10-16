'use client';

import { GlobalOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';

import { ScopeTooltip } from '@/features/data-grid/bindings/entitycore/renderers/scope-tooltip';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';
import { projectScopeIconFlag, useFlag } from '@/features/feature-flags';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { ICellRendererProps } from '@/features/data-grid/react';

/** Cell-renderer registry key for the public/project scope icon. */
export const SCOPE_RENDERER = 'scope';

/** One colour per scope, shared by the cells and the header toggles. */
export const SCOPE_COLORS = { public: 'text-green-600', project: 'text-primary-4' } as const;

interface IScopeRow {
  authorized_public?: boolean | null;
}

/** The project mark: two people, or one while the `project-scope-icon` flag says so. */
export function useProjectScopeIcon() {
  return useFlag(projectScopeIconFlag.key) === 'one' ? UserOutlined : TeamOutlined;
}

/** A globe for a public record, people for one private to the project. */
export function ScopeCell({ row }: ICellRendererProps<IScopeRow>): ReactNode | null {
  const ProjectIcon = useProjectScopeIcon();
  if (typeof row?.authorized_public !== 'boolean') return EMPTY_PLACEHOLDER;
  const label = row.authorized_public ? 'Public' : 'Project';
  const Icon = row.authorized_public ? GlobalOutlined : ProjectIcon;
  const color = row.authorized_public ? SCOPE_COLORS.public : SCOPE_COLORS.project;
  return (
    // to the side and a beat late, so sweeping down the column does not flash one per row
    <ScopeTooltip isPublic={row.authorized_public} side="right" delayDuration={200}>
      <span
        data-testid={`scope-cell-${label.toLowerCase()}`}
        className={cn('flex h-full items-center justify-center text-lg', color)}
      >
        <Icon aria-label={label} />
      </span>
    </ScopeTooltip>
  );
}
