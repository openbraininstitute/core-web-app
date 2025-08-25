import { CaretRightFilled } from '@ant-design/icons';

import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

function SkeletonItem({
  width,
  depth = 0,
  hasChildren = false,
}: {
  width: string;
  depth?: number;
  hasChildren?: boolean;
}) {
  const paddingLeft = depth * 10;

  return (
    <div
      className="flex w-full items-center justify-between"
      style={{ paddingLeft: `${paddingLeft}px` }}
    >
      <Skeleton className="bg-neutral-1 h-3 w-3/5" style={{ width }} />
      <div className="flex items-center justify-center gap-1">
        <Skeleton className="bg-neutral-1 h-3 w-7" />
        <CaretRightFilled
          size={14}
          className={cn('text-neutral-1 text-base', {
            'rotate-90': hasChildren,
          })}
        />
      </div>
    </div>
  );
}

export function CellCompositionSkeleton() {
  return (
    <div className="mx-auto w-full rounded-lg bg-transparent text-white">
      <div className="mb-6 flex flex-col items-center justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <Skeleton className="bg-neutral-1 h-3 w-3/5" />
          <Skeleton className="bg-neutral-1 h-3 w-1/5" />
        </div>
        <div className="flex w-full items-center justify-between gap-4">
          <Skeleton className="bg-neutral-1 h-3 w-2/5 rounded-full" />
          <Skeleton className="bg-neutral-1 h-3 w-2/5" />
        </div>
      </div>
      <div className="border-primary-7 w-full rounded-lg border p-4">
        <Skeleton className="bg-neutral-1 mb-4 h-2 w-2/5" />

        <div className="flex w-full flex-col items-center gap-3">
          <SkeletonItem width="75%" depth={0} />
          <SkeletonItem width="50%" depth={0} />
          <SkeletonItem width="30%" depth={0} />
          <SkeletonItem width="50%" depth={0} hasChildren />
          <SkeletonItem width="32%" depth={1} />
          <SkeletonItem width="32%" depth={0} />
          <SkeletonItem width="50%" depth={0} hasChildren />
          <SkeletonItem width="50%" depth={1} />
          <SkeletonItem width="32%" depth={0} />
          <SkeletonItem width="50%" depth={0} hasChildren />
          <SkeletonItem width="50%" depth={1} />
          <SkeletonItem width="32%" depth={0} />
          <SkeletonItem width="50%" depth={0} hasChildren />
          <SkeletonItem width="50%" depth={1} />
        </div>
      </div>
    </div>
  );
}
