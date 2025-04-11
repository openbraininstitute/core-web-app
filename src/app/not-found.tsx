'use client';

import { WarningOutlined } from '@ant-design/icons';
import Link from 'next/link';

export default function NotFoundContent() {
  return (
    <div className="bg-primary-9 flex h-screen w-full flex-col items-center justify-center p-6 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-2 flex items-center justify-start gap-2">
          <WarningOutlined className="text-3xl text-[#f0c75e]" />
          <h1 className="text-4xl font-bold text-[#f0c75e]">404</h1>
        </div>

        <div className="mb-2 w-full bg-white p-6">
          <h2 className="text-primary-8 mb-2 text-sm font-medium select-none">DESCRIPTION</h2>
          <p className="text-primary-8 text-xl font-bold">This page doesn&lsquo;t exist</p>
        </div>

        <div className="flex w-full gap-2">
          <Link href="/app/virtual-lab/explore/interactive" className="w-1/2">
            <div className="hover:bg-opacity-10 border border-white py-4 text-center text-base font-medium text-white transition-colors hover:bg-white">
              Back to Explore
            </div>
          </Link>
          <Link href="/app/virtual-lab" className="w-1/2">
            <div className="hover:bg-opacity-10 border border-white py-4 text-center text-base font-medium text-white transition-colors hover:bg-white">
              Back to home
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
