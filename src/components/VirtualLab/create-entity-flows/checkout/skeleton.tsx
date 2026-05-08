'use client';

import { cn } from '@/utils/css-class';

function Placeholder({ className }: { className: string }) {
  return <div className={cn('animate-pulse rounded-sm bg-white/15', className)} />;
}

function PlanGridSkeleton() {
  const planSlots = [0, 1, 2, 3] as const;
  const featureRowIdsBySlot = [
    ['f1-a', 'f1-b', 'f1-c'],
    ['f2-a', 'f2-b', 'f2-c', 'f2-d'],
    ['f0-a', 'f0-b', 'f0-c', 'f0-d', 'f0-e', 'f0-f'],
    ['f3-a', 'f3-b', 'f3-c', 'f3-d'],
  ] as const;

  return (
    <div className="grid items-stretch gap-4 h-full p-4 sm:grid-cols-2 xl:grid-cols-4">
      {planSlots.map((slot) => (
        <div key={slot} className="flex h-full min-h-0 flex-col gap-y-4 self-stretch rounded-xl">
          <div className="relative flex min-h-0 flex-1 flex-col rounded-xl border border-primary-7 bg-primary-9 p-6">
            <div className="space-y-3">
              <Placeholder className="h-7 w-28 rounded-full" />
              <Placeholder className="h-9 w-full max-w-[200px] rounded-full" />
              <Placeholder className="h-4 w-20 rounded-full" />
            </div>
            <div className="mt-8 space-y-3">
              {featureRowIdsBySlot[slot].map((rowId) => (
                <div key={rowId} className="flex items-center gap-2">
                  <Placeholder className="h-4 flex-1 rounded-full" />
                  <Placeholder className="h-5 w-5 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
            <div className="mt-8 space-y-3">
              {featureRowIdsBySlot.toReversed()[slot].map((rowId) => (
                <div key={rowId} className="flex items-center gap-2">
                  <Placeholder className="h-4 flex-1 rounded-full" />
                  <Placeholder className="h-5 w-5 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-auto flex min-h-18 shrink-0 items-end pb-6">
            <Placeholder className="h-12 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TiersListSkeleton() {
  return (
    <div id="tiers-list-container" className="mx-auto flex h-full w-full max-w-7xl flex-col">
      <PlanGridSkeleton />
    </div>
  );
}
