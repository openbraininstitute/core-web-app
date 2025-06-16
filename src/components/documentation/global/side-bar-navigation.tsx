'use client';

import { HomeOutlined, QuestionCircleOutlined, UserOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import Link from 'next/link';

import HelpMenu from '@/components/HelpMenu';
import DocumentationIcon from '@/components/icons/DocumentationIcon';
import UserMenu from '@/components/user-menu';

export default function SideBarNavigation() {
  return (
    <div className="fixed left-0 top-0 flex h-screen w-[45px] flex-col items-center justify-between border-r-[1px] border-primary-7 bg-primary-9">
      <Link
        href="/app/virtual-lab"
        className="relative -left-0.5 top-[82px] origin-center -rotate-90  whitespace-nowrap font-serif text-lg text-white"
      >
        Open Brain Institute
      </Link>

      <div className="mb-5 flex w-full flex-col items-center gap-2 overflow-hidden text-primary-3">
        <Tooltip title="Documentation" placement="topLeft">
          <Link href="/app/documentation" className="flex h-10 w-10 items-center justify-center">
            <DocumentationIcon iconColor="#91d5ff" className="h-3 w-auto" />
          </Link>
        </Tooltip>
        <HelpMenu>
          <QuestionCircleOutlined className="group-hover:text-white" />
        </HelpMenu>
        <UserMenu>
          <UserOutlined className="group-hover:text-white" />
        </UserMenu>
        <Link href="/app/virtual-lab" className="group cursor-pointer">
          <HomeOutlined className="group-hover:text-white" />
        </Link>
      </div>
    </div>
  );
}
