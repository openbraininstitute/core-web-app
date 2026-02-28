import { Skeleton } from '@/ui/molecules/skeleton';

export default function Loading() {
  return (
    <div className="border-neutral-2 ml-4 flex h-full w-[calc(100%-1rem)] flex-col rounded-2xl border p-3 px-2">
      {/* Top bar: panel tabs + breadcrumb */}
      <div className="flex items-center justify-between px-2 pb-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      {/* Content: sidebar + form + recording panel */}
      <div className="flex h-[calc(100vh-11rem)] w-full">
        {/* Left sidebar */}
        <div className="flex w-80 shrink-0 flex-col gap-4 px-2">
          <Skeleton className="mb-1 h-3 w-14" />
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-12 w-full rounded-full" />

          <Skeleton className="mt-2 mb-1 h-3 w-20" />
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-12 w-full rounded-full" />

          <Skeleton className="mt-2 mb-1 h-3 w-28" />
          <Skeleton className="h-12 w-full rounded-full" />

          <div className="mt-auto py-2">
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>

        {/* Middle: form area */}
        <div className="flex h-full flex-1 flex-col gap-4 px-6">
          <Skeleton className="h-7 w-40" />
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-24 w-full rounded-md" />
            </div>
          </div>
        </div>

        {/* Right: recording panel */}
        <div className="h-full w-1/3 rounded-2xl border-white bg-white p-4 shadow-xs">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
