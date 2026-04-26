'use client';

import { Skeleton } from '@/ui/molecules/skeleton';

export function LogsLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-neutral-200 bg-white p-3">
        <div className="mb-2 flex items-center gap-2">
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <Skeleton className="mb-2 h-3 w-11/12" />
        <Skeleton className="h-3 w-8/12" />
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-3">
        <div className="mb-2 flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="mb-2 h-3 w-10/12" />
        <Skeleton className="h-3 w-9/12" />
      </div>
    </div>
  );
}
