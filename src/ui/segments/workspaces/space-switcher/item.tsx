'use client';

import { LoadingOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { orderBy } from 'es-toolkit/compat';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { setUserRecentWorkspace } from '@/api/virtual-lab-svc/queries/user';
import { LabCompany } from '@/components/icons/buttons';
import { config } from '@/config';
import { Button } from '@/ui/molecules/button';
import {
  makeTriggerWorkspaceConfigurationClickEvent,
  WorkspaceActions,
} from '@/ui/segments/workspaces/space-manager/event';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { Project, TVirtualLab } from '@/api/virtual-lab-svc/queries/types';

type Props = {
  lab: TVirtualLab & { isMine: boolean };
  isActive: boolean;
  isOpen: boolean;
  isAdmin: boolean;
  activeProjectId: string | null;
  expandedLabs: Set<string>;
  tryingToExpand: Set<string>;
  toggleLabExpansion: (id: string, action?: 'trying' | 'opened') => void;
  onCreateProject: () => void;
};

export function Item({
  lab,
  activeProjectId,
  isActive,
  isOpen,
  isAdmin,
  expandedLabs,
  tryingToExpand,
  toggleLabExpansion,
  onCreateProject,
}: Props) {
  const {
    isLoading: projectsLoading,
    data: projects,
    isFetched,
    isSuccess,
  } = useQuery({
    queryKey: keyBuilder.listWorkspaceProjects({ virtualLabId: lab.id! }),
    queryFn: async () => await listProjects({ virtualLabId: lab.id! }),
    enabled: !!lab.id && (isOpen || tryingToExpand.has(lab.id)),
  });
  const data = orderBy(projects?.data?.results, ['updated_at'], ['desc']);

  // automatically move from trying to expanded when query succeeds
  useEffect(() => {
    if (tryingToExpand.has(lab.id) && isSuccess && isFetched) {
      toggleLabExpansion(lab.id, 'opened');
    }
  }, [tryingToExpand, lab.id, isSuccess, isFetched, toggleLabExpansion]);

  const onDownClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    if (expandedLabs.has(lab.id)) {
      // lab is expanded, collapse it
      toggleLabExpansion(lab.id);
    } else if (tryingToExpand.has(lab.id)) {
      // lab is trying to expand, cancel it
      toggleLabExpansion(lab.id);
    } else {
      // lab is not expanded or trying, start trying to expand
      toggleLabExpansion(lab.id, 'trying');
    }
  };

  const router = useRouter();
  const recentWorkspaceMutation = useMutation({
    mutationFn: ({ vlabId, prjId }: { vlabId: string; prjId: string }) =>
      setUserRecentWorkspace({ workspace: { virtualLabId: vlabId, projectId: prjId } }),
  });

  const onProjectHover = ({
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

  const onProjectLeave = () => {
    makeTriggerWorkspaceConfigurationClickEvent({
      on: false,
      type: WorkspaceActions.ProjectPreview,
      data: null,
    });
  };

  const onProjectClick = ({
    virtualLabId,
    project,
  }: {
    virtualLabId: string;
    project: Project;
  }) => {
    recentWorkspaceMutation.mutate({ vlabId: virtualLabId, prjId: project.id });
    makeTriggerWorkspaceConfigurationClickEvent({ on: false, type: null, data: null });
    router.push(`${config.ROOT_ROUTE}/${virtualLabId}/${project.id}`);
  };

  const onVlabClick = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.KeyboardEvent<HTMLDivElement>
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

  const onVlabHover = () => {
    makeTriggerWorkspaceConfigurationClickEvent({
      on: true,
      type: WorkspaceActions.VirtualLabConfiguration,
      data: {
        virtualLabId: lab.id,
        data: lab,
      },
    });
  };

  const onVlabLeave = () => {
    makeTriggerWorkspaceConfigurationClickEvent({
      on: false,
      type: WorkspaceActions.VirtualLabConfiguration,
      data: null,
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
          'group flex cursor-pointer items-center justify-between px-2 py-3 transition-colors duration-150',
          'rounded-2xl',
          { 'hover:bg-neutral-1': !lab.isMine },
          { 'rounded-b-none': expandedLabs.has(lab.id) },
          { 'bg-primary-9 hover:bg-primary-9 text-white': lab.isMine }
        )}
        onKeyDown={onVlabClick}
        onClick={onVlabClick}
        onMouseEnter={onVlabHover}
        onMouseLeave={onVlabLeave}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 select-none">
          {isActive && (
            <div
              id="active-lab-indicator"
              className={cn('mx-2 block h-3 w-3 rounded-full', {
                'bg-white': isOpen,
                'bg-primary-9': !isOpen,
              })}
            />
          )}
          <LabCompany
            className={cn('text-label size-4! min-h-4 min-w-4', { 'text-primary-3': lab.isMine })}
          />
          <h4
            className={cn('text-primary-9 text-md line-clamp-1 truncate font-bold', {
              'text-white! group-hover:text-white!': lab.isMine,
            })}
            title={lab.name}
          >
            {lab.name}
          </h4>
        </div>
        <div className="ml-auto flex items-center">
          <motion.div
            animate={{ rotate: expandedLabs.has(lab.id) ? 90 : 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {tryingToExpand.has(lab.id) && projectsLoading ? (
              <LoadingOutlined spin />
            ) : (
              <Button
                rounded
                size="sm"
                variant="outline"
                className="flex h-7 w-7 items-center justify-center rounded-full border-none bg-transparent p-0"
                onClick={onDownClick}
              >
                <RightOutlined
                  className={cn(
                    'h-4 w-4',
                    lab.isMine
                      ? 'text-primary-3 group-hover:text-primary-3 hover:text-primary-3'
                      : 'text-primary-7 group-hover:text-primary-8 hover:text-white'
                  )}
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
                      'w-full justify-start border-2 border-transparent shadow-sm',
                      isProjectActive
                        ? 'bg-primary-9 text-white font-bold border-primary-9 hover:bg-primary-9 hover:text-white'
                        : 'bg-white text-primary-9 hover:border-primary-9 hover:bg-white'
                    )}
                    title={project.name}
                    onMouseEnter={() => onProjectHover({ virtualLabId: lab.id, project })}
                    onMouseLeave={onProjectLeave}
                    onClick={() => onProjectClick({ virtualLabId: lab.id, project })}
                    id={`project-item-${project.id}`}
                    data-testid="project-item-selector"
                  >
                    {isProjectActive && (
                      <div className="mr-2 size-3 min-h-3 min-w-3 rounded-[9999px] bg-current" />
                    )}
                    <span className="line-clamp-1 truncate" title={project.name}>
                      {project.name}
                    </span>
                  </Button>
                </motion.div>
              );
            })}
            {isAdmin && (
              <Button
                rounded
                size="md"
                variant="outline"
                className="mt-2 mr-auto w-max border-0 bg-green-600 px-4 font-semibold text-white shadow-sm hover:bg-green-700 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateProject();
                }}
              >
                Add project
                <PlusOutlined className="ml-auto text-sm" />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
