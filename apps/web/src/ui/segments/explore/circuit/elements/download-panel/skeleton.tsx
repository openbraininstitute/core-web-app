import { classNames } from '@/util/utils';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      className={classNames(
        'bg-skeleton relative overflow-hidden rounded-md',
        animate && 'animate-pulse',
        className
      )}
    >
      {animate && (
        <div className="bg-primary-2 absolute inset-0 animate-pulse bg-gradient-to-r from-transparent to-white" />
      )}
    </div>
  );
}

interface Props {
  className?: string;
  itemsCount?: number;
}

export function SkeletonItem({ className, itemsCount = 1 }: Props) {
  return (
    <div className={classNames('bg-primary-9 text-primary-8 rounded-lg', className)}>
      <div id="skeleton-header" className="bg-primary-9 mb-6 p-3">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded-full!" />
          <Skeleton className="h-6 w-80" />
          <div className="ml-auto">
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <div id="skeleton-description" className="mb-4 space-y-2">
          <Skeleton className="h-2 w-96" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-2 w-32" />
            <Skeleton className="h-2 w-24 opacity-70" />
          </div>
        </div>
      </div>
      <div className="ml-3 flex w-full flex-col gap-2">
        {Array.from({ length: itemsCount }).map((_, index) => {
          return (
            // eslint-disable-next-line react/no-array-index-key
            <div id="skeleton-file-entry" className="rounded-lg bg-black/10 p-4" key={index}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="mb-2">
                    <Skeleton className="h-4 w-56" />
                  </div>
                  <Skeleton className="h-2 w-32" />
                </div>
                <div id="skeleton-file-size-and-download-button" className="flex items-start gap-4">
                  <div className="text-right">
                    <Skeleton className="mt-1 mb-1 h-5 w-24" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded border border-white/20" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
