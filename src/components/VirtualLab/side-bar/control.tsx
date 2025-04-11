'use client';

import Link from 'next/link';
import { HomeOutlined, QuestionCircleOutlined, UserOutlined } from '@ant-design/icons';

import { classNames } from '@/util/utils';
import UserMenu from '@/components/user-menu';
import HelpMenu from '@/components/HelpMenu';

export default function Profile() {
  return (
    <div className="mt-auto flex flex-col gap-4">
      <HelpMenu
        cls={{
          trigger: 'p-0!',
        }}
      >
        <div
          className={classNames(
            'flex w-max items-center justify-center p-3',
            'text-white transition-all duration-200',
            'hover:border-primary-5 hover:bg-primary-5 border border-white'
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
          'hover:border-primary-5 hover:bg-primary-5 border border-white'
        )}
      >
        <HomeOutlined className="text-xl" />
      </Link>
      <UserMenu
        cls={{
          trigger: 'p-0!',
        }}
      >
        <div
          className={classNames(
            'flex w-max items-center justify-center p-3',
            'text-white transition-all duration-200',
            'hover:border-primary-5 hover:bg-primary-5 border border-white'
          )}
        >
          <UserOutlined className="text-xl" />
        </div>
      </UserMenu>
    </div>
  );
}
