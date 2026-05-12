'use client';

import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { RiArrowDownSLine, RiArrowRightSLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import { orderBy } from 'es-toolkit/compat';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { Button } from '@/ui/molecules/button';
import {
  makeTriggerWorkspaceConfigurationClickEvent,
  WorkspaceActions,
} from '@/ui/segments/workspaces/space-manager/event';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { Project, TVirtualLab } from '@/api/virtual-lab-svc/queries/types';

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
    queryKey: keyBuilder.listWorkspaceProjects({ virtualLabId: lab.id }),
    queryFn: async () => await listProjects({ virtualLabId: lab.id }),
    enabled: !!lab.id && (isOpen || tryingToExpand.has(lab.id)),
  });

  const data = orderBy(projects?.data?.data ?? [], ['updated_at'], ['desc']);

  useEffect(() => {
    if (tryingToExpand.has(lab.id) && isSuccess && isFetched) {
      toggleLabExpansion(lab.id, 'opened');
    }
  }, [tryingToExpand, lab.id, isSuccess, isFetched, toggleLabExpansion]);

  const onDownClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    if (expandedLabs.has(lab.id)) {
      toggleLabExpansion(lab.id);
    } else if (tryingToExpand.has(lab.id)) {
      toggleLabExpansion(lab.id);
    } else {
      toggleLabExpansion(lab.id, 'trying');
    }
  };

  const onProjectClick = ({
    virtualLabId,
    project,
  }: {
    virtualLabId: string;
    project: Project;
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

  return (
    <div className={cn('border-neutral-2 text-primary-9 bg-background mx-3 rounded-2xl border')}>
      {/** biome-ignore lint/a11y/useSemanticElements: button can't have nested buttons */}
      <div
        role="button"
        tabIndex={-1}
        aria-label="virtual-lab-item"
        data-testid="virtual-lab-item"
        className={cn(
          'group flex cursor-pointer items-center justify-between pl-4 pr-2 py-3 transition-colors duration-150 hover:bg-gray-50',
          'hover:bg-neutral-1 rounded-2xl',
          { 'rounded-b-none': expandedLabs.has(lab.id) },
          { 'bg-primary-9! text-white': isUserLab }
        )}
        onKeyDown={onVlabClick}
        onClick={onVlabClick}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 select-none">
          {isActive && (
            <div
              id="active-lab-indicator"
              className={cn('block size-2 lg:size-2.5 rounded-full', {
                'bg-white! group-hover:bg-white!': isUserLab,
                'bg-primary-9! group-hover:bg-primary-8!': !isUserLab && isActive,
                'bg-primary-9': !isOpen,
              })}
            />
          )}
          <h4
            className={cn('text-primary-9 text-md line-clamp-1 truncate font-bold', {
              'group-hover:text-white! text-white!': isUserLab,
            })}
            title={lab.name}
          >
            {lab.name}
          </h4>
        </div>
        <div className="ml-auto flex items-center gap-1">
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
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border-none bg-transparent p-0',
                  'group-hover:active:text-white! group-hover:border group-hover:shadow-sm'
                )}
                onClick={onDownClick}
              >
                <RiArrowDownSLine
                  className={cn(' size-6', {
                    'group-hover:text-white! text-white!': isUserLab,
                    'group-hover:text-primary-8! text-primary-8!': !isUserLab && isActive,
                  })}
                />
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
            {data?.map((project, projectIndex) => {
              const isProjectActive = project.id === activeProjectId;
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
                        'text-primary-8 scale-101 hover:text-primary-9 bg-white! font-bold shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)]':
                          isProjectActive,
                      }
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
            <div className="mt-1 flex justify-end">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
