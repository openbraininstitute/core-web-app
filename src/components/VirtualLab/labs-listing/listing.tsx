'use client';

import Link from 'next/link';
import { PlusOutlined } from '@ant-design/icons';

import Item from '@/components/VirtualLab/item/vlab-item';
import { VirtualLab } from '@/api/virtual-lab-svc/queries/types';

type Props = {
  virtualLab: {
    data: VirtualLab;
    membersCount: number | null;
    projectsCount: number | null;
  };
  pendingLabs: Array<VirtualLab>;
};

export default function VirtualLabDashboard({ virtualLab, pendingLabs }: Props) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="primary-scrollbar flex-1 overflow-y-auto pr-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            <Item
              key={virtualLab.data.id}
              id={virtualLab.data.id}
              name={virtualLab.data.name}
              lastUpdate={virtualLab.data.updated_at}
              projectCount={virtualLab.projectsCount}
              memberCount={virtualLab.membersCount}
            />
          </div>
          <div className="flex flex-col gap-3">
            {pendingLabs.map((vl) => (
              <Item
                pending
                key={vl.id}
                id={vl.id}
                name={vl.name}
                lastUpdate={vl.created_at}
                projectCount={30}
                memberCount={30}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="ml-auto mt-4 flex items-center gap-3 pr-3">
        <Link
          className="rounded-none border-none font-bold"
          href="/app/virtual-lab/lab/project/create"
        >
          <div className="group flex h-12 items-center justify-between gap-8 bg-white px-4 py-2 text-primary-9">
            <span>Create project</span>
            <PlusOutlined className="text-lg group-hover:scale-105" />
          </div>
        </Link>
      </div>
    </div>
  );
}
