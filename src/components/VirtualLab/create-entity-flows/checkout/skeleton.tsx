'use client';

function Placeholder({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-sm bg-gray-200 ${className}`} />;
}

export default function TiersComparisonSkeleton() {
  const skeletonTiers = [1, 2, 3];
  const skeletonCategories = [1, 2, 3, 4];
  const skeletonFeatures = [1, 2, 3];

  return (
    <div className="bg-primary-9 w-full p-6 text-white">
      <div className="grid grid-cols-4 gap-6">
        <div />
        {skeletonTiers.map((tier) => (
          <div key={tier} className="flex flex-col">
            <Placeholder className="mb-2 h-8 w-32" />
            <div className="mb-4 text-left">
              <Placeholder className="mb-2 h-6 w-24" />
              <Placeholder className="h-4 w-16" />
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <Placeholder className="mb-1 h-4 w-full" />
              <Placeholder className="mb-1 h-4 w-full" />
              <Placeholder className="mb-1 h-4 w-full" />
            </div>
          </div>
        ))}
      </div>

      {skeletonCategories.map((category) => (
        <div key={category} className="mt-8">
          <Placeholder className="mb-4 h-6 w-40" />

          {skeletonFeatures.map((feature) => (
            <div key={feature} className="grid grid-cols-4 gap-6 py-2">
              <Placeholder className="h-5 w-full" />
              {skeletonTiers.map((tier) => (
                <div key={`${tier}-${feature}`} className="flex justify-center">
                  <Placeholder className="h-6 w-6 rounded-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      <div className="mt-8 grid grid-cols-4 gap-6">
        <div />
        <div />
        {[1, 2].map((tier) => (
          <div key={`${tier}-action`} className="flex justify-center">
            <Placeholder className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TiersListSkeleton() {
  return (
    <div className="mx-auto max-w-4xl">
      <TiersComparisonSkeleton />
    </div>
  );
}
