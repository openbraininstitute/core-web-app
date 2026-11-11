import { Skeleton } from '@/ui/molecules/skeleton';

export default function Loading() {
  return (
    <div className="bg-background flex h-full max-h-[calc(100vh-4rem)]">
      <aside className="bg-card flex w-96 flex-col gap-6 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-full" />
          <Skeleton className="h-14 w-full rounded-full" />
          <Skeleton className="h-14 w-full rounded-full" />
          <Skeleton className="h-14 w-full rounded-full" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </aside>

      <main className="h-full flex-1 overflow-auto">
        <div className="h-full p-8">
          <div className="mb-8 flex flex-col items-start gap-2">
            <Skeleton className="mb-2 h-4 w-12" />
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="mb-8 grid grid-cols-3 gap-8">
            <div className="space-y-6">
              <div>
                <Skeleton className="mb-2 h-3 w-24" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="mt-1 h-6 w-3/4" />
                <Skeleton className="mt-1 h-6 w-full" />
              </div>
              <div>
                <Skeleton className="mb-2 h-3 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <Skeleton className="mb-2 h-3 w-28" />
                <Skeleton className="h-5 w-40" />
              </div>
              <div>
                <Skeleton className="mb-2 h-3 w-32" />
                <Skeleton className="h-5 w-8" />
              </div>
              <div>
                <Skeleton className="mb-2 h-3 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <Skeleton className="mb-2 h-3 w-36" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div>
                <Skeleton className="mb-2 h-3 w-40" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div>
                <Skeleton className="mb-2 h-3 w-36" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </div>

          <div className="bg-muted relative h-[calc(100%-250px)] w-full overflow-hidden rounded-lg">
            <Skeleton className="absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="space-y-3 text-center">
                <div className="border-neutral-1 mx-auto h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
