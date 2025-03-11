import Link from 'next/link';

import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';

import Item from '@/components/VirtualLab/item/project-item';
import { virtualLabProjectsAtomFamily } from '@/state/virtual-lab/projects';

export default function VirtualLabProjectList({ id }: { id: string }) {
  const virtualLabProjects = useAtomValue(unwrap(virtualLabProjectsAtomFamily(id)));

  if (!virtualLabProjects) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" indicator={<LoadingOutlined />} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100%-4.5rem)] w-full flex-col">
      <div className="primary-scrollbar mt-4 flex-1 overflow-y-auto pr-2">
        <div className="flex flex-col gap-4">
          {virtualLabProjects.results.map((project) => (
            <Item
              key={project.id}
              id={project.id}
              vlabId={project.virtual_lab_id}
              lastUpdate={project.updated_at}
              memberCount={0}
              name={project.name}
            />
          ))}
        </div>
      </div>
      <div className="ml-auto mt-4 flex items-center gap-3 pr-3">
        <Link
          className="w-max rounded-none border-none font-bold text-primary-9"
          href={`/app/virtual-lab/lab/${id}/project/create`}
        >
          <div className="group flex h-12 items-center justify-between gap-8 bg-white px-4 py-2">
            <span>Create project</span>
            <PlusOutlined className="text-lg group-hover:scale-105" />
          </div>
        </Link>
      </div>
    </div>
  );
}
