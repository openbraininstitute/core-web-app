import { Skeleton } from '@/ui/molecules/skeleton';

export function SelectAllSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="size-4 shrink-0 rounded" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export function LaunchActionSkeleton() {
  return <Skeleton className="min-h-[50px] w-full rounded-full" />;
}

export function ConfigListCardSkeletonItem() {
  return (
    <div className="flex-none">
      <div className="rounded-lg border-2 border-transparent bg-white px-4 pb-4">
        <div className="mb-2 flex h-18 w-full items-center justify-between">
          <Skeleton className="h-7 min-w-0 max-w-[70%] flex-1" />
          <div className="ml-4 flex shrink-0 items-center gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="size-4 shrink-0 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {(['sp-a', 'sp-b', 'sp-c', 'sp-d'] as const).map((key) => (
            <div key={key} className="overflow-x-hidden">
              <Skeleton className="mb-1 h-3 w-20" />
              <Skeleton className="h-5 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ConfigListCardSkeleton() {
  return ['lc-1', 'lc-2', 'lc-3', 'lc-4'].map((i) => <ConfigListCardSkeletonItem key={i} />);
}

export function InOutFilesColumnSkeleton() {
  return (
    <div className="h-full overflow-y-auto pr-2 secondary-scrollbar bg-background!">
      <Skeleton className="h-5 w-36 rounded-full" />
      <div className="mt-4 mb-8 flex flex-col gap-4">
        {(['file-a', 'file-b', 'file-c', 'file-d'] as const).map((key) => (
          <div
            key={key}
            className="flex w-full items-center justify-between rounded-4xl gap-4 bg-white p-4"
          >
            <Skeleton className="h-5 min-w-0 flex-1 rounded-full" />
            <Skeleton className="ml-4 h-5 w-14 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
