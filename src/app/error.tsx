'use client';

import Link from 'next/link';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { SharedLayout } from '@/ui/layouts/shared-layout';
import { Button } from '@/ui/molecules/button';

import type { ErrorComponentProps } from '@/types/common';

export default function Error({ error }: ErrorComponentProps) {
  const breakpoint = useDefaultBreakpoint();

  return (
    <SharedLayout>
      <div className="flex max-w-md flex-col items-center gap-6">
        <div className="mx-auto flex w-full flex-col items-center justify-center">
          <h1 className="text-primary-9 text-5xl font-bold">Error</h1>
          <p className="text-primary-8 my-4 rounded-xl border border-gray-200 p-5 text-xl font-light select-none">
            {error.message}
          </p>
        </div>
        <Button
          rounded
          asChild
          variant="success"
          size={breakpoint === 'xl' ? 'lg' : 'md'}
          type="submit"
          className="disabled:bg-neutral-1 disabled:text-neutral-4! w-full px-8! py-6! font-bold hover:text-white"
        >
          <Link href="/app/virtual-lab/sync" className="flex items-center justify-center gap-3.5">
            <span>Go to project</span>
          </Link>
        </Button>
      </div>
    </SharedLayout>
  );
}
