'use client';

import { Skeleton } from '@/ui/molecules/skeleton';

export function ProjectCardSkeletonShimmer() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-neutral-2 p-4 flex flex-col gap-1.5">
      <div className="flex items-start justify-between">
        <Skeleton className="h-6 w-4/5 rounded-full lg:h-7 2xl:h-9" />
        <Skeleton className="size-6 shrink-0 rounded-full lg:size-7! 2xl:size-9!" />
      </div>

      <div className="flex flex-col gap-2 mt-1">
        <Skeleton className="h-3 w-full 2xl:h-5" />
        <Skeleton className="h-3 w-full 2xl:h-5" />
        <Skeleton className="h-3 w-5/6 2xl:h-5" />
        <Skeleton className="h-3 w-3/4 2xl:h-5" />
        <Skeleton className="h-3 w-full 2xl:h-5" />
      </div>
    </div>
  );
}
