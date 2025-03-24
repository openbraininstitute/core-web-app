'use client';

import Link from 'next/link';
import { PlusOutlined } from '@ant-design/icons';

import Item from '@/components/VirtualLab/item/vlab-item';
import { VirtualLab } from '@/api/virtual-lab-svc/queries/types';

type Props = {
  virtualLab: VirtualLab;
  pendingLabs: Array<VirtualLab>;
  membership_labs: Array<VirtualLab>;
};

export default function VirtualLabDashboard({ virtualLab, pendingLabs, membership_labs }: Props) {
  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
      <div className="primary-scrollbar flex-1 overflow-y-auto pr-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            <Item
              key={virtualLab.id}
              id={virtualLab.id}
              name={virtualLab.name}
              lastUpdate={virtualLab.updated_at}
              projectCount={virtualLab.projects_count}
              memberCount={virtualLab.members_count}
            />
          </div>
          {Boolean(membership_labs?.length) && (
            <div className="flex flex-col">
              <div className="my-5 text-xl font-bold text-primary-1">Virtual Lab I am a member</div>
              <div className="flex flex-col gap-3">
                {membership_labs?.map((vl) => (
                  <Item
                    key={vl.id}
                    id={vl.id}
                    name={vl.name}
                    lastUpdate={vl.created_at}
                    projectCount={vl.projects_count}
                    memberCount={vl.members_count}
                  />
                ))}
              </div>
            </div>
          )}
          {Boolean(pendingLabs?.length) && (
            <div className="flex flex-col gap-3">
              {pendingLabs?.map((vl) => (
                <Item
                  pending
                  key={vl.id}
                  id={vl.id}
                  name={vl.name}
                  lastUpdate={vl.created_at}
                  projectCount={null}
                  memberCount={null}
                />
              ))}
            </div>
          )}
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
