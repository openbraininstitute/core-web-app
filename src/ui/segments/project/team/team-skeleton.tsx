import { Skeleton } from '@/ui/molecules/skeleton';

export function ProjectTeamSkeleton() {
  return (
    <div className="mx-auto w-full space-y-4 p-6">
      <div className="flex items-center justify-between p-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-5 w-24" />
      </div>
      {Array.from({ length: 3 })
        .fill('item')
        .map((_, i) => (
          <div
            className="flex items-center justify-between rounded-none bg-transparent px-4 py-2"
            key={`sk-team-mem-${i}`}
          >
            <div className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16" />

              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>

            <Skeleton className="h-5 w-24" />
          </div>
        ))}
    </div>
  );
}
