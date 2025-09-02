'use client';

import { DownOutlined, LoadingOutlined, RightOutlined, SettingOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  makeTriggerWorkspaceConfigurationClickEvent,
  WorkspaceActions,
} from '@/ui/segments/workspaces/space-manager/event';
import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { Project, VirtualLab } from '@/api/virtual-lab-svc/queries/types';

type Props = {
  lab: VirtualLab & { isMine: boolean };
  isOpen: boolean;
  activeProjectId: string | null;
  expandedLabs: Set<string>;
  tryingToExpand: Set<string>;
  toggleLabExpansion: (id: string, action?: 'trying' | 'opened') => void;
};

export function Item({
  lab,
  activeProjectId,
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
  const data = projects?.data?.results;

  // automatically move from trying to expanded when query succeeds
  useEffect(() => {
    if (tryingToExpand.has(lab.id) && isSuccess && isFetched) {
      toggleLabExpansion(lab.id, 'opened');
    }
  }, [tryingToExpand, lab.id, isSuccess, isFetched, toggleLabExpansion]);

  const onClick = () => {
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

  return (
    <>
      <div // eslint-disable-line jsx-a11y/interactive-supports-focus
        role="button"
        aria-label="virtual-lab-switcher"
        data-testid="virtual-lab-switcher"
        className={cn(
          'flex cursor-pointer items-center justify-between px-4 py-3 transition-colors duration-150 hover:bg-gray-50',
          { 'bg-primary-9 hover:bg-primary-8 mx-2 mt-2 rounded-full py-2 text-white!': lab.isMine },
          { 'mb-2': !expandedLabs.has(lab.id) && lab.isMine }
        )}
        onKeyDown={onClick}
        onClick={onClick}
      >
        <h4
          className={cn('text-primary-9 text-md font-bold', {
            'text-white!': lab.isMine,
          })}
        >
          {lab.name}
        </h4>
        <div className="flex items-center space-x-2">
          <SettingOutlined
            className={cn(
              'hover:text-primary-9 h-4 w-4 cursor-pointer text-gray-400 transition-colors duration-150',
              { 'hover:text-primary-4 text-white!': lab.isMine }
            )}
            onClick={(e) => {
              e.stopPropagation();
              makeTriggerWorkspaceConfigurationClickEvent({
                on: true,
                type: WorkspaceActions.VirtualLabConfiguration,
                data: {
                  virtualLabId: lab.id,
                  data: lab,
                },
              });
            }}
          />
          <motion.div
            animate={{ rotate: expandedLabs.has(lab.id) ? 180 : 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {tryingToExpand.has(lab.id) && projectsLoading ? (
              <LoadingOutlined spin />
            ) : (
              <DownOutlined className="h-4 w-4 text-gray-200" />
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
            className="flex flex-col gap-1 overflow-hidden py-2"
          >
            {data?.map((project, projectIndex) => {
              const isActive = project.id === activeProjectId;
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: projectIndex * 0.01, duration: 0.1 }}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between px-4 transition-colors duration-150'
                  )}
                >
                  <Button
                    borderless
                    rounded
                    size="md"
                    variant="outline"
                    className={cn('mx-2 w-full justify-start shadow-sm', {
                      'text-primary-8 hover:text-primary-9 bg-gradient-to-br from-zinc-200 to-slate-50 font-bold':
                        isActive,
                    })}
                    title={project.name}
                    onClick={() =>
                      onProjectClick({
                        virtualLabId: lab.id,
                        project,
                      })
                    }
                  >
                    {isActive && <div className="mr-2 h-3 w-3 rounded-full bg-current" />}
                    <span className="line-clamp-1 truncate"> {project.name}</span>
                    <RightOutlined
                      className={`ml-auto ${isActive ? 'text-neutral-2' : 'text-neutral-3'}`}
                    />
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
