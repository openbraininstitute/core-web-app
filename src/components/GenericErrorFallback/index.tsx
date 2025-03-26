'use client';

import { WarningOutlined } from '@ant-design/icons';
import Link from 'next/link';

export default function ErrorComponent({ error }: { error: Error & { cause?: unknown } }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-primary-9 p-6 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-2 flex items-center justify-start gap-2">
          <WarningOutlined className="text-3xl text-[#f0c75e]" />
          <h1 className="text-4xl font-bold text-[#f0c75e]">An error occurred</h1>
        </div>

        <div className="mb-2 w-full bg-white p-6">
          <h2 className="mb-2 select-none text-sm font-medium text-primary-8">DESCRIPTION</h2>
          <p className="text-xl font-bold text-primary-8">
            {error?.message ||
              'We apologize, but something unexpected went wrong. Please try again later.'}
          </p>
        </div>

        <div className="flex w-full gap-2">
          <Link href="/app/virtual-lab/explore/interactive" className="w-1/2">
            <div className="border border-white py-4 text-center text-base font-medium text-white transition-colors hover:bg-white hover:bg-opacity-10">
              Back to Explore
            </div>
          </Link>
          <Link href="/app/virtual-lab" className="w-1/2">
            <div className="border border-white py-4 text-center text-base font-medium text-white transition-colors hover:bg-white hover:bg-opacity-10">
              Back to home
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
