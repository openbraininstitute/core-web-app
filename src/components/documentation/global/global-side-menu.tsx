'use client';

import { HomeOutlined, QuestionCircleOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';

import HelpMenu from '@/components/HelpMenu';
import UserMenu from '@/components/user-menu';
import { classNames } from '@/util/utils';

export default function GlobalSideMenu() {
  return (
    <div className="fixed bottom-8 left-8 z-50 flex flex-col gap-4">
      <HelpMenu
        cls={{
          trigger: '!p-0',
        }}
      >
        <div
          className={classNames(
            'flex w-max items-center justify-center p-3',
            'text-white transition-all duration-200',
            'border-primary-6 bg-primary-9 hover:border-primary-5 hover:bg-primary-5 border'
          )}
        >
          <QuestionCircleOutlined className="text-xl" />
        </div>
      </HelpMenu>
      <Link
        href="/app/virtual-lab"
        aria-label="home"
        type="button"
        className={classNames(
          'flex w-max items-center justify-center p-3',
          'text-white transition-all duration-200',
          'border-primary-6 bg-primary-9 hover:border-primary-5 hover:bg-primary-5 border'
        )}
      >
        <HomeOutlined className="text-xl" />
      </Link>
      <UserMenu
        cls={{
          trigger: '!p-0',
        }}
      >
        <div
          className={classNames(
            'flex w-max items-center justify-center p-3',
            'text-white transition-all duration-200',
            'border-primary-6 bg-primary-9 hover:border-primary-5 hover:bg-primary-5 border'
          )}
        >
          <UserOutlined className="text-xl" />
        </div>
      </UserMenu>
    </div>
  );
}
