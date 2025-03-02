import { classNames } from '@/util/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={classNames('bg-muted animate-pulse rounded-md', className)}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    />
  );
}

function PricingCardSkeleton() {
  return (
    <div className="relative flex min-h-[600px] flex-col rounded-lg border bg-white p-6">
      <div className="flex-1 space-y-6">
        {/* title */}
        <Skeleton className="h-8 w-32" />

        {/* price */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-36" />
        </div>

        {/* notes */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-52" />
        </div>

        {/* features */}
        <div className="space-y-4">
          {[1, 2].map((category) => (
            <div key={category} className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <div className="space-y-2">
                {[1, 2, 3].map((feature) => (
                  <div key={feature} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* buttons */}
      <div className="mt-6 space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

export default PricingCardSkeleton;
