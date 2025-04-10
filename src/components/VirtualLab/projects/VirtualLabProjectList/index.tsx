'use client';

import { useRef, memo, useMemo } from 'react';
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import Link from 'next/link';

import Item from '@/components/VirtualLab/item/project-item';
import { virtualLabProjectsAtomFamily } from '@/state/virtual-lab/projects';
import { Project } from '@/api/virtual-lab-svc/queries/types';

interface ProjectListContentProps {
  projects: Array<Project>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const ProjectListContent = memo(({ projects, containerRef }: ProjectListContentProps) => {
  return (
    <div ref={containerRef} className="primary-scrollbar h-full overflow-y-auto pr-5">
      <div className="flex flex-col gap-4 pb-2">
        {projects.map((project) => (
          <Item
            key={project.id}
            id={project.id}
            vlabId={project.virtual_lab_id}
            lastUpdate={project.updated_at}
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
  return (
    <div className="mt-4 ml-auto flex items-center gap-3 pr-3">
      <Link
        className="text-primary-9 w-max rounded-none border-none font-bold"
        href={`/app/virtual-lab/lab/${labId}/project/create`}
      >
        <div className="group flex h-12 items-center justify-between gap-8 bg-white px-4 py-2">
          <span>Create project</span>
          <PlusOutlined className="text-lg group-hover:scale-105" />
        </div>
      </Link>
    </div>
  );
});

CreateProjectButton.displayName = 'CreateProjectButton';

export default function VirtualLabProjectList({ id }: { id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const currentProjects = useAtomValue(
    unwrap(
      virtualLabProjectsAtomFamily({
        virtualLabId: id,
        page: 1,
        size: 20, // Fixed size of 20
      })
    )
  );

  const projects = useMemo(
    () => currentProjects?.data?.results || [],
    [currentProjects?.data?.results]
  );

  if (!currentProjects?.data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" indicator={<LoadingOutlined />} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="h-[calc(100%-80px)] overflow-hidden">
        <ProjectListContent projects={projects} containerRef={containerRef} />
      </div>
      <div className="mt-auto ml-auto">
        <CreateProjectButton labId={id} />
      </div>
    </div>
  );
}
