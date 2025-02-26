import Link from 'next/link';

import { PlusOutlined, LoadingOutlined, SearchOutlined } from '@ant-design/icons';
import { ConfigProvider, Spin } from 'antd';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';

import VirtualLabProjectItem from '@/components/VirtualLab/projects/VirtualLabProjectList/VirtualLabProjectItem';
import { virtualLabProjectsAtomFamily } from '@/state/virtual-lab/projects';

function SearchProjects() {
  return (
    <ConfigProvider
      theme={{
        components: {
          Input: {
            colorTextPlaceholder: '#69C0FF',
            colorBgContainer: 'rgba(255,255,255,0)',
          },
          Button: {
            colorPrimary: 'rgba(255,255,255,0)',
          },
        },
      }}
    >
      <div className="flex w-[300px] justify-between border-b bg-transparent pb-[2px]">
        <input
          placeholder="Search for projects..."
          className="bg-transparent text-primary-3 outline-none placeholder:text-primary-3"
        />
        <SearchOutlined />
      </div>
    </ConfigProvider>
  );
}

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
    <>
      <div className="my-5">
        <div className="flex flex-col gap-6">
          <div className="flex flex-row justify-between">
            <div className="flex flex-row items-center gap-8">
              <div className="flex gap-2">
                <span className="text-primary-3">Total projects</span>
                <span className="font-bold">{virtualLabProjects.results.length}</span>
              </div>
              <SearchProjects />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {virtualLabProjects.results.map((project) => (
              <VirtualLabProjectItem key={project.id} project={project} />
            ))}
          </div>
        </div>
      </div>
      <div className="fixed bottom-5 right-5 z-10">
        <Link
          className="rounded-none border-none font-bold text-primary-9"
          href={`/app/virtual-lab/lab/${id}/project/create`}
        >
          <div className="group flex h-12 items-center justify-between gap-8 bg-white px-4 py-2">
            <span>Create project</span>
            <PlusOutlined className="text-lg group-hover:scale-105" />
          </div>
        </Link>
      </div>
    </>
  );
}
