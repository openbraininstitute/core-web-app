'use client';

import Link from 'next/link';
import { PlusOutlined } from '@ant-design/icons';

import Item from '@/components/VirtualLab/item/vlab-item';
import { VirtualLab } from '@/types/virtual-lab/lab';

export default function VirtualLabDashboard({ virtualLabs }: { virtualLabs: VirtualLab[] }) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="primary-scrollbar flex-1 overflow-y-auto pr-2">
        <div className="flex flex-col gap-3">
          {virtualLabs.map((vl) => (
            <Item
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
