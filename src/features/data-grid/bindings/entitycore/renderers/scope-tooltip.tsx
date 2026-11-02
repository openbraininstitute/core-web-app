'use client';

import { useQuery } from '@tanstack/react-query';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { LightTooltip } from '@/features/data-grid/bindings/entitycore/renderers/light-tooltip';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { openSpaceSwitcher } from '@/ui/segments/workspaces/space-switcher/event';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { ReactElement } from 'react';
import type { TScopeKind } from '@/features/data-grid/bindings/entitycore/scope-filter';

export const SCOPE_LABELS: Record<TScopeKind, string> = {
  public: 'Public',
  project: 'Project',
  published: 'Project, made public',
};

/** Rendered only while its tooltip is open, so the project is fetched on demand. */
function ProjectScopeHint({
  published,
  note,
  canChangeProject,
}: {
  published?: boolean;
  note?: string;
  canChangeProject: boolean;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const { data: project } = useQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
    enabled: !!virtualLabId && !!projectId,
    staleTime: Number.POSITIVE_INFINITY,
  });

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span>Project{project?.name ? `: ${project.name}` : ''}</span>
      {published && <span>Made public</span>}
      {note && <span className="opacity-80">{note}</span>}
      {canChangeProject && (
        <button
          type="button"
          onClick={openSpaceSwitcher}
          className="bg-primary-1 text-primary-9 hover:bg-primary-2 rounded-full px-2.5 py-0.5 font-semibold transition-colors"
        >
          Change project
        </button>
      )}
    </div>
  );
}

interface IScopeTooltipProps {
  kind: TScopeKind;
  /** a line under the hint, e.g. why a toggle cannot be switched off */
  note?: string;
  /** offers "Change project": the column header's icons only, not every row's */
  canChangeProject?: boolean;
  /** the hovered element; Radix hands it a ref and its handlers */
  children: ReactElement;
  delayDuration?: number;
}

/** The scope's hover card, shared by the header toggles and the row icons. */
export function ScopeTooltip({
  kind,
  note,
  canChangeProject = false,
  children,
  delayDuration,
}: IScopeTooltipProps) {
  return (
    <LightTooltip
      delayDuration={delayDuration}
      // the label keeps the screen-reader copy of the content free of its button
      ariaLabel={note ? `${SCOPE_LABELS[kind]}. ${note}` : SCOPE_LABELS[kind]}
      label={
        kind === 'public' ? (
          <div className="flex flex-col items-start gap-1.5">
            <span>Public</span>
            {note && <span className="opacity-80">{note}</span>}
          </div>
        ) : (
          <ProjectScopeHint
            published={kind === 'published'}
            note={note}
            canChangeProject={canChangeProject}
          />
        )
      }
    >
      {children}
    </LightTooltip>
  );
}
