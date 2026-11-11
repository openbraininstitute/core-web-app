'use client';

import Link from 'next/link';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { SharedLayout } from '@/ui/layouts/shared-layout';
import { Button } from '@/ui/molecules/button';

export default function Custom500() {
  const breakpoint = useDefaultBreakpoint();

  return (
    <SharedLayout>
      <div className="flex max-w-md flex-col items-center gap-6">
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
          <h1 className="text-primary-9 text-8xl font-bold">500</h1>
          <p className="text-primary-8 text-xl font-semibold">Server-side error occurred</p>
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
