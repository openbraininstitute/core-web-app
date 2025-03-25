'use client';

import Link from 'next/link';
import { HomeOutlined, UserOutlined } from '@ant-design/icons';

import { classNames } from '@/util/utils';
import UserMenu from '@/components/user-menu';

export default function Profile() {
  return (
    <div className="mt-auto flex flex-col gap-4">
      <Link
        href="/app/virtual-lab"
        aria-label="home"
        type="button"
        className={classNames(
          'flex w-max items-center justify-center p-3',
          'text-white transition-all duration-200',
          'border border-white hover:border-primary-5 hover:bg-primary-5'
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
            'border border-white hover:border-primary-5 hover:bg-primary-5'
          )}
        >
          <UserOutlined className="text-xl" />
        </div>
      </UserMenu>
    </div>
  );
}
