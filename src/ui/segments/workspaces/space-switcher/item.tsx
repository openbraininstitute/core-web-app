'use client';

import { DownOutlined, LoadingOutlined, RightOutlined } from '@ant-design/icons';
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
  activeProjectId: string | null;
  expandedLabs: Set<string>;
  tryingToExpand: Set<string>;
  toggleLabExpansion: (id: string, action?: 'trying' | 'opened') => void;
};

export function Item({
  lab,
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

  return (
    <div className={cn('border-neutral-2 text-primary-9 bg-background mx-3 rounded-2xl border')}>
      {/** biome-ignore lint/a11y/useSemanticElements: button can't have nested buttons */}
      <div
        role="button"
        tabIndex={-1}
        aria-label="virtual-lab-item"
        data-testid="virtual-lab-item"
        className={cn(
          'group flex cursor-pointer items-center justify-between px-2 py-3 transition-colors duration-150 hover:bg-gray-50',
          'hover:bg-neutral-1 rounded-2xl',
          { 'rounded-b-none': expandedLabs.has(lab.id) },
          { 'bg-primary-9 text-white': lab.isMine }
        )}
        onKeyDown={onVlabClick}
        onClick={onVlabClick}
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
              'group-hover:text-primary-8! text-white!': lab.isMine,
            })}
            title={lab.name}
          >
            {lab.name}
          </h4>
        </div>
        <div className="ml-auto flex items-center">
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
                className="flex h-7 w-7 items-center justify-center rounded-full border-none bg-transparent p-0"
                onClick={onDownClick}
              >
                <DownOutlined
                  className={cn(
                    'text-primary-7 group-hover:text-primary-8 h-4 w-4 hover:text-white',
                    { 'hover:text-primary-4 text-primary-3': lab.isMine }
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
                    borderless
                    rounded
                    size="md"
                    variant="outline"
                    className={cn('w-full justify-start shadow-sm', {
                      'text-primary-8 hover:text-primary-9 bg-white font-bold shadow-[16px_16px_30px_0px_#0000000F,-12px_-8px_32px_0px_#FFFFFF52]':
                        isProjectActive,
                    })}
                    title={project.name}
                    onMouseEnter={() => onProjectHover({ virtualLabId: lab.id, project })}
                    onFocus={() => onProjectHover({ virtualLabId: lab.id, project })}
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
                    <RightOutlined
                      className={`ml-auto ${isProjectActive ? 'text-neutral-2' : 'text-neutral-3'}`}
                    />
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
