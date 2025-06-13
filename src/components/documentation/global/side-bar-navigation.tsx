'use client';

import { HomeOutlined, QuestionCircleOutlined, UserOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import Link from 'next/link';

import HelpMenu from '@/components/HelpMenu';
import DocumentationIcon from '@/components/icons/DocumentationIcon';
import UserMenu from '@/components/user-menu';

export default function SideBarNavigation() {
  return (
    <div className="border-primary-7 bg-primary-9 fixed top-0 left-0 flex h-screen w-[45px] flex-col items-center justify-between border-r-[1px]">
      <Link
        href="/app/virtual-lab"
        className="relative top-[82px] -left-0.5 origin-center -rotate-90 font-serif text-lg whitespace-nowrap text-white"
      >
        Open Brain Institute
      </Link>

      <div className="text-primary-3 mb-5 flex w-full flex-col items-center gap-2 overflow-hidden">
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
