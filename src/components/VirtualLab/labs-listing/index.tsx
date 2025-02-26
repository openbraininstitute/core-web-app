'use client';

import { useState } from 'react';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { Switch } from 'antd';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import VirtualLabAndProject from '@/components/VirtualLab/labs-listing/VirtualLabAndProject';
import DashboardTotals from '@/components/VirtualLab/labs-listing/totals';
import { VirtualLab } from '@/types/virtual-lab/lab';

function VirtualLabDashboard({ virtualLabs }: { virtualLabs: VirtualLab[] }) {
  const [showOnlyLabs, setShowOnlyLabs] = useState<boolean>(false);

  return (
    <>
      <div className="inset-0 z-0 grid grid-cols-[1fr_4fr] grid-rows-1 bg-primary-9 text-white">
        <div className="mt-[25%] flex gap-3">
          <div>Show only virtual labs</div>
          <Switch
            value={showOnlyLabs}
            onChange={(value) => {
              setShowOnlyLabs(value);
            }}
          />
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            <div className="text-5xl font-bold uppercase">Your virtual labs and projects</div>
            <DashboardTotals />
          </div>
          {virtualLabs.map((vl) => (
            <VirtualLabAndProject
              key={vl.id}
              id={vl.id}
              name={vl.name}
              description={vl.description}
              createdAt={vl.created_at}
              showOnlyLabs={showOnlyLabs}
            />
          ))}
          <div className="fixed bottom-5 right-5 flex items-center gap-3">
            <Link
              className="rounded-none border-none font-bold"
              href="/app/virtual-lab/lab/project/create"
            >
              <div className="group flex h-12 items-center justify-between gap-8 bg-white px-4 py-2 text-primary-9">
                <span>Create project</span>
                <PlusOutlined className="text-lg group-hover:scale-105" />
              </div>
            </Link>
            <Link className="rounded-none border-none font-bold" href="/app/virtual-lab/lab/create">
              <div className="group flex h-12 items-center justify-between gap-8 bg-white px-4 py-2 text-primary-9">
                <span>Create Virtual lab</span>
                <PlusOutlined className="text-lg group-hover:scale-105" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default dynamic(() => Promise.resolve(VirtualLabDashboard), {
  ssr: false,
  loading: () => (
    <div className="flex flex-grow items-center justify-center text-3xl text-white">
      <LoadingOutlined />
    </div>
  ),
});
