'use client';

import { UserOutlined } from '@ant-design/icons';

import { classNames } from '@/util/utils';

export default function Profile() {
  return (
    <div className="mt-auto flex flex-col gap-4">
      <button
        aria-label="profile"
        type="button"
        className={classNames(
          'flex w-max items-center justify-center p-3',
          'text-white transition-all duration-200',
          'border border-white hover:border-primary-5 hover:bg-primary-5'
        )}
      >
        <UserOutlined className="text-xl" />
      </button>
    </div>
  );
}
