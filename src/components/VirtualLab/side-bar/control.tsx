'use client';

import { HomeOutlined, QuestionCircleOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';

import HelpMenu from '@/components/HelpMenu';
import { DocumentIcon } from '@/components/icons';
import UserMenu from '@/components/user-menu';
import { classNames } from '@/util/utils';

export default function Profile() {
  return (
    <div className="mt-auto flex flex-col gap-4">
      <Link
        href="/app/documentation"
        aria-label="documentation"
        className={classNames(
          'flex h-12 w-12 items-center justify-center p-3',
          'text-white transition-all duration-200',
          'border border-primary-6 hover:border-primary-5 hover:bg-primary-5'
        )}
      >
        <DocumentIcon iconColor="white" className="h-auto w-4" />
      </Link>
      <HelpMenu
        cls={{
          trigger: '!p-0',
        }}
      >
        <div
          className={classNames(
            'flex w-max items-center justify-center p-3',
            'text-white transition-all duration-200',
            'border border-primary-6 hover:border-primary-5 hover:bg-primary-5'
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
          'border border-primary-6 hover:border-primary-5 hover:bg-primary-5'
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
            'border border-primary-6 hover:border-primary-5 hover:bg-primary-5'
          )}
        >
          <UserOutlined className="text-xl" />
        </div>
      </UserMenu>
    </div>
  );
}
