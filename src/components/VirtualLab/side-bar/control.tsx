'use client';

import { HomeOutlined, QuestionCircleOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import HelpMenu from '@/components/HelpMenu';
import { DocumentationIcon } from '@/components/icons';
import UserMenu from '@/components/user-menu';
import { classNames } from '@/util/utils';

export default function Profile() {
  const pathName = usePathname();

  return (
    <div className="mt-auto flex flex-col gap-4">
      {pathName !== '/app/virtual-lab' && (
        <Link
          href="/app/virtual-lab"
          aria-label="home"
          type="button"
          className={classNames(
            'flex w-max items-center justify-center p-3',
            'text-white transition-all duration-200',
            'border-primary-6 hover:border-primary-5 hover:bg-primary-5 border'
          )}
        >
          <HomeOutlined className="text-xl" />
        </Link>
      )}
      <Link
        href="/app/documentation"
        aria-label="documentation"
        className={classNames(
          'flex h-12 w-12 items-center justify-center p-3',
          'text-white transition-all duration-200',
          'border-primary-6 hover:border-primary-5 hover:bg-primary-5 border'
        )}
      >
        <DocumentationIcon className="h-auto w-5 text-white" />
      </Link>
      <HelpMenu
        cls={{
          trigger: 'p-0!',
        }}
      >
        <div
          className={classNames(
            'flex w-max items-center justify-center p-3',
            'text-white transition-all duration-200',
            'border-primary-6 hover:border-primary-5 hover:bg-primary-5 border'
          )}
        >
          <QuestionCircleOutlined className="text-xl" />
        </div>
      </HelpMenu>
      <UserMenu
        cls={{
          trigger: 'p-0!',
        }}
      >
        <div
          className={classNames(
            'flex w-max items-center justify-center p-3',
            'text-white transition-all duration-200',
            'border-primary-6 hover:border-primary-5 hover:bg-primary-5 border'
          )}
        >
          <UserOutlined className="text-xl" />
        </div>
      </UserMenu>
    </div>
  );
}
