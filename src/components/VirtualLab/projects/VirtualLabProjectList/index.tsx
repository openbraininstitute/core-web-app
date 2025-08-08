'use client';

import { memo, useMemo, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import Link from 'next/link';

import { CustomPopover } from '@/features/entities/neuron-simulation/experiment/elements/popover';
import { virtualLabProjectsAtomFamily } from '@/state/virtual-lab/projects';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { Project } from '@/api/virtual-lab-svc/queries/types';
import Item from '@/components/VirtualLab/item/project-item';

interface ProjectListContentProps {
  projects: Array<Project>;
}

const ProjectListContent = memo(({ projects }: ProjectListContentProps) => {
  return (
    <div className="primary-scrollbar h-full overflow-y-auto pr-5">
      <div className="flex flex-col gap-4 pb-2">
        {projects.map((project) => (
          <Item
            key={project.id}
            id={project.id}
            description={project.description}
            vlabId={project.virtual_lab_id}
            creationDate={project.created_at}
            memberCount={project.user_count}
            name={project.name}
          />
        ))}
      </div>
    </div>
  );
});

ProjectListContent.displayName = 'ProjectListContent';

interface CreateProjectButtonProps {
  labId: string;
}

const CreateProjectButton = memo(({ labId }: CreateProjectButtonProps) => {
  const [popoverOpen, setIsPopoverOpen] = useState(false);
  const { isAdmin, loading } = useUserPermissions({ virtualLabId: labId });
  const allowedOperation = isAdmin && !loading;

  const onOpenChange = (visible: boolean) => {
    if (loading) return;
    if (!allowedOperation || !visible) setIsPopoverOpen(true);
    else setIsPopoverOpen(false);
  };

  return (
    <div className="mt-4 ml-auto flex items-center gap-3 pr-3">
      <CustomPopover
        when={['hover']}
        message="You must have Owner/Administrator role to create a project."
        placement="topLeft"
        visible={popoverOpen}
        onOpenChange={onOpenChange}
      >
        <button
          role="link"
          type="button"
          className="text-primary-9 w-max rounded-none border-none font-bold"
          aria-label="Create project"
          disabled={!allowedOperation}
          onMouseLeave={() => setIsPopoverOpen(false)}
        >
          <Link
            href={`/app/virtual-lab/lab/${labId}/project/create`}
            aria-disabled={!allowedOperation}
          >
            <div className="group flex h-12 items-center justify-between gap-8 bg-white px-4 py-2">
              <span>Create project</span>
              <PlusOutlined className="text-lg group-hover:scale-105" />
            </div>
          </Link>
        </button>
      </CustomPopover>
    </div>
  );
});

CreateProjectButton.displayName = 'CreateProjectButton';

export default function VirtualLabProjectList({ id }: { id: string }) {
  const currentProjects = useAtomValue(
    useMemo(
      () =>
        unwrap(
          virtualLabProjectsAtomFamily({
            virtualLabId: id,
            page: 1,
            size: 20, // Fixed size of 20
          })
        ),
      [id]
    )
  );

  const projects = useMemo(
    () => currentProjects?.data?.results || [],
    [currentProjects?.data?.results]
  );

  return (
    <div className="flex h-full w-full flex-col">
      <div className="h-[calc(100%-80px)] overflow-hidden">
        <ProjectListContent projects={projects} />
      </div>
      <div className="mt-auto ml-auto">
        <CreateProjectButton labId={id} />
      </div>
    </div>
  );
}
