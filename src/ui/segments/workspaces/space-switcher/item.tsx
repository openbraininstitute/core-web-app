'use client';

import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiHome8Line,
  RiSettings3Line,
} from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { Button } from '@/ui/molecules/button';
import { Skeleton } from '@/ui/molecules/skeleton';
import {
  makeTriggerWorkspaceConfigurationClickEvent,
  type TTriggerWorkspaceConfigurationClickEvent,
  useWorkspaceConfigurationClickEvent,
  WorkspaceActions,
} from '@/ui/segments/workspaces/space-manager/event';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { IProject, TVirtualLab } from '@/api/virtual-lab-svc/queries/types';

type Props = {
  lab: TVirtualLab;
  isUserLab: boolean;
  isActive: boolean;
  isOpen: boolean;
  activeProjectId: string | null;
  expandedLabs: Set<string>;
  tryingToExpand: Set<string>;
  toggleLabExpansion: (id: string, action?: 'trying' | 'opened') => void;
};

export function Item({
  lab,
  isUserLab,
  activeProjectId,
  isActive,
  isOpen,
  expandedLabs,
  tryingToExpand,
  toggleLabExpansion,
}: Props) {
  const {
    isLoading: projectsLoading,
    data: projects,
    isFetched,
    isSuccess,
  } = useQuery({
    queryKey: keyBuilder.listWorkspaceProjects({
      virtualLabId: lab.id,
      filter: { order_by: 'updated_at', order_direction: 'desc' },
    }),
    queryFn: async () =>
      await listProjects({
        virtualLabId: lab.id,
        // TODO: do not fetch by fixed page_size
        // make it loop through pages until it gets all projects
        pagination: { page: 1, page_size: 40 },
        filter: { order_by: 'updated_at', order_direction: 'desc' },
      }),
    enabled: !!lab.id && (isOpen || tryingToExpand.has(lab.id)),
  });
  const { isVirtualLabAdmin, isVirtualLabOwner } = useWorkspaceMembership({ virtualLabId: lab.id });
  const canCreateProject = isVirtualLabAdmin || isVirtualLabOwner;

  useEffect(() => {
    if (tryingToExpand.has(lab.id) && isSuccess && isFetched) {
      toggleLabExpansion(lab.id, 'opened');
    }
  }, [tryingToExpand, lab.id, isSuccess, isFetched, toggleLabExpansion]);

  const toggle = () => {
    if (expandedLabs.has(lab.id) || tryingToExpand.has(lab.id)) {
      toggleLabExpansion(lab.id);
    } else {
      toggleLabExpansion(lab.id, 'trying');
    }
  };

  const onToggleClick = (e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
    e.stopPropagation();
    toggle();
  };

  const onProjectClick = ({
    virtualLabId,
    project,
  }: {
    virtualLabId: string;
    project: IProject;
  }) => {
    makeTriggerWorkspaceConfigurationClickEvent({
      on: true,
      type: WorkspaceActions.ProjectPreview,
      data: {
        virtualLabId,
        projectId: project.id,
        data: project,
      },
    });
  };

  const onCreateProject = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    makeTriggerWorkspaceConfigurationClickEvent({
      on: true,
      type: WorkspaceActions.NewProject,
      data: { mode: 'fixed-virtual-lab', virtualLabId: lab.id },
    });
  };

  const onVlabClick = (
    e: React.MouseEvent<HTMLElement, MouseEvent> | React.KeyboardEvent<HTMLElement>
  ) => {
    e.stopPropagation();
    makeTriggerWorkspaceConfigurationClickEvent({
      on: true,
      type: WorkspaceActions.VirtualLabConfiguration,
      data: {
        virtualLabId: lab.id,
        data: lab,
      },
    });
  };

  const projectRows = projects?.data ?? [];
  const hasProjects = projectRows.length > 0;
  const isExpanded = expandedLabs.has(lab.id);
  const showProjectsSkeleton = isExpanded && !hasProjects && (projectsLoading || !isFetched);
  const showProjectsEmpty = isExpanded && !projectsLoading && isFetched && !hasProjects;

  // Which lab/project (if any) currently has a manager modal open.
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  useWorkspaceConfigurationClickEvent(
    useCallback((event: CustomEvent<TTriggerWorkspaceConfigurationClickEvent<unknown>>) => {
      const payload = event.detail.data as {
        virtualLabId?: string;
        projectId?: string;
        data?: { id?: string } | null;
      } | null;
      const isManagerModal =
        event.detail.type === WorkspaceActions.VirtualLabConfiguration ||
        event.detail.type === WorkspaceActions.ProjectPreview;
      setSelectedLabId(event.detail.on && isManagerModal ? (payload?.virtualLabId ?? null) : null);
      setSelectedProjectId(
        event.detail.on && event.detail.type === WorkspaceActions.ProjectPreview
          ? (payload?.projectId ?? payload?.data?.id ?? null)
          : null
      );
    }, [])
  );

  const isSelected = selectedLabId === lab.id;

  // two orthogonal states shown in distinct visual channels so they never
  // compete for "current":
  // - location (URL virtual lab) -> persistent light-blue card + "Active virtual lab" note
  // - own lab                    -> "My virtual lab" note + home icon, no special fill
  // - focus (modal open)         -> primary outline ring (border-2), no fill change
  const eyebrow = isActive ? 'Active virtual lab' : isUserLab ? 'My virtual lab' : null;

  return (
    <div
      className={cn('text-primary-9 mx-3 overflow-hidden rounded-2xl border', {
        'border-[#E9F7FF]! bg-white! shadow-xs border-3!': isActive,
        'border-gray-200 bg-background': !isActive,
        'border-2! border-primary-9!': isSelected,
      })}
    >
      {/** biome-ignore lint/a11y/useSemanticElements: button can't have nested buttons */}
      <div
        role="button"
        tabIndex={-1}
        id={`virtual-lab-item-${lab.id}`}
        aria-label="virtual-lab-item"
        data-testid="virtual-lab-item"
        className={cn(
          'group flex cursor-pointer items-center justify-between pl-4 pr-2 py-3 transition-colors duration-150 rounded-md',
          { 'rounded-b-none': expandedLabs.has(lab.id) },
          { 'bg-[#E9F7FF]! hover:bg-[#c5e8ff]! hover:border-[#c5e8ff]!': isActive },
          { 'hover:bg-neutral-1': !isActive }
        )}
        onKeyDown={onToggleClick}
        onClick={onToggleClick}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 select-none">
          {isUserLab && <RiHome8Line className="size-6 shrink-0 text-gray-400" aria-hidden />}
          <div className="flex min-w-0 flex-col">
            {eyebrow && (
              <span className="text-primary-7 truncate text-[11px] font-medium uppercase leading-none tracking-wide">
                {eyebrow}
              </span>
            )}
            <h4 className="text-primary-9 text-md line-clamp-1 truncate font-bold" title={lab.name}>
              {lab.name}
            </h4>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            rounded
            size="sm"
            variant="outline"
            aria-label="virtual-lab-settings"
            data-testid="virtual-lab-settings"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full border-none bg-transparent p-0',
              'hover:shadow-sm'
            )}
            onClick={onVlabClick}
          >
            <RiSettings3Line className="size-5" />
          </Button>
          <motion.div
            animate={{ rotate: expandedLabs.has(lab.id) ? 180 : 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {tryingToExpand.has(lab.id) && projectsLoading ? (
              <LoadingOutlined spin />
            ) : (
              <Button
                rounded
                size="sm"
                variant="outline"
                aria-label="virtual-lab-toggle"
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border-none bg-transparent p-0',
                  'hover:shadow-sm'
                )}
                onClick={onToggleClick}
              >
                <RiArrowDownSLine className="size-6" />
              </Button>
            )}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {expandedLabs.has(lab.id) && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'flex flex-col gap-1 overflow-hidden bg-white px-2 py-2 will-change-auto',
              {
                'rounded-b-2xl': expandedLabs.has(lab.id),
              }
            )}
          >
            {showProjectsSkeleton &&
              Array.from({ length: 3 }).map((_, skeletonIndex) => (
                <Skeleton
                  // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
                  key={`project-skeleton-${skeletonIndex}`}
                  className="h-10 w-full rounded-full"
                />
              ))}
            {hasProjects &&
              projectRows.map((project, projectIndex) => {
                const isProjectActive = project.id === activeProjectId;
                const isProjectSelected = project.id === selectedProjectId;
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: projectIndex * 0.01, duration: 0.1 }}
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between transition-colors duration-150'
                    )}
                  >
                    <Button
                      rounded
                      size="md"
                      variant="outline"
                      className={cn(
                        'w-full justify-start bg-white! border shadow-none border-gray-200',
                        'hover:bg-gray-100!',
                        {
                          'text-primary-8 scale-101 hover:text-primary-9 bg-gray-50! font-bold shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)]':
                            isProjectActive,
                        },
                        { 'border-3! border-gray-200! bg-gray-50!': isProjectSelected }
                      )}
                      title={project.name}
                      onClick={() =>
                        onProjectClick({
                          virtualLabId: lab.id,
                          project,
                        })
                      }
                      id={`project-item-${project.id}`}
                      data-testid="project-item-selector"
                    >
                      <span className="line-clamp-1 truncate" title={project.name}>
                        {project.name}
                      </span>
                      <RiArrowRightSLine
                        className={`ml-auto ${isProjectActive ? 'text-primary-9! translate-x-0.5' : 'text-gray-300!'}`}
                      />
                    </Button>
                  </motion.div>
                );
              })}
            {showProjectsEmpty && (
              <div
                data-testid="space-switcher-projects-empty"
                className="rounded-xl border border-dashed border-gray-200 bg-neutral-1/40 px-3 py-5 text-center"
              >
                <p className="text-primary-8 text-sm font-medium">No projects to display</p>
                {!canCreateProject && (
                  <div className="flex flex-col items-center justify-start">
                    <p className="text-primary-8/70 mt-1 text-left text-xs font-normal">
                      You currently do not have access to any projects in this lab or permission to
                      create new ones.
                    </p>
                    <p className="text-primary-8/70 mt-1 text-left text-xs font-normal">
                      Reach out to the lab owner for access or project creation permissions.
                    </p>
                  </div>
                )}
              </div>
            )}
            {canCreateProject && (
              <div className={cn('flex justify-end', hasProjects ? 'mt-1' : 'mt-2')}>
                <Button
                  rounded
                  size="md"
                  variant="outline"
                  className={cn(
                    'border-gray-200 text-gray-500 hover:text-primary-9 hover:bg-gray-50!',
                    'min-w-32 justify-between rounded-full bg-white px-4 text-sm font-semibold'
                  )}
                  onClick={onCreateProject}
                >
                  Add project
                  <PlusOutlined className="ml-3 text-sm" />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
