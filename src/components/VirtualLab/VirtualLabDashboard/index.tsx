'use client';

import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Switch } from 'antd';
import { useState } from 'react';
import dynamic from 'next/dynamic';

import CreateVirtualLabButton from '@/components/VirtualLab/CreateVirtualLabButton';
import VirtualLabAndProject from '@/components/VirtualLab/VirtualLabDashboard/VirtualLabAndProject';
import DashboardTotals from '@/components/VirtualLab/VirtualLabDashboard/DashboardTotals';
import CreationModal from '@/components/VirtualLab/create-entity-flows/project/in-home';
import { VirtualLab } from '@/types/virtual-lab/lab';

function VirtualLabDashboard({ virtualLabs }: { virtualLabs: VirtualLab[] }) {
  const [showOnlyLabs, setShowOnlyLabs] = useState<boolean>(false);
  const [isOpen, setOpen] = useState(false);
  const onOpen = () => setOpen(true);
  const onClose = () => setOpen(false);

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
          <div className="fixed bottom-5 right-5">
            <Button
              className="mr-5 h-12 w-52 rounded-none border-none text-sm font-bold"
              onClick={onOpen}
            >
              <span className="relative text-primary-8">
                Create project <PlusOutlined className="relative left-3 top-[0.1rem]" />
              </span>
            </Button>
            <CreateVirtualLabButton />
          </div>
        </div>
      </div>
      <CreationModal
        vlabsList={virtualLabs.map((vl) => ({ label: vl.name, value: vl.id }))}
        isOpen={isOpen}
        onClose={onClose}
      />
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
