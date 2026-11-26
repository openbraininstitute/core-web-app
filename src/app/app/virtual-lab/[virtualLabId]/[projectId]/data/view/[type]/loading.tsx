import { Skeleton } from '@/ui/molecules/skeleton';

/**
 * A details page while it loads, laid out as the page itself (the user asked them to match, data-view-layout.tsx and
 * detail-view-body.tsx): the top bar with its breadcrumb pill and close, then the bordered white card with the side
 * menu's pills down its left fifth and the navy panel holding the name and the section over the rest.
 */
export default function Loading() {
  return (
    <div className="ml-5 flex h-full min-h-0 flex-col max-md:mx-3">
      {/* the top bar: the breadcrumb's pill at its start, the close at its end */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-2">
        <Skeleton className="h-9 w-80 max-w-[70%] rounded-full" />
        <Skeleton className="size-9 rounded-full max-md:hidden" />
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#D9D9D9] bg-white max-md:border-0">
        <div className="flex min-h-0 flex-1 gap-3 overflow-hidden pt-3 max-md:flex-col max-md:gap-2 max-md:pt-0">
          {/* the side menu: its sections as pills, the actions under them */}
          <div className="flex w-1/5 shrink-0 flex-col gap-1.5 bg-white pl-3.5 max-md:w-full max-md:flex-row max-md:pl-0">
            {['w-full', 'w-full', 'w-full', 'w-full'].map((w, i) => (
              // eslint-disable-next-line react/no-array-index-key -- fixed placeholder rows
              <Skeleton key={i} className={`h-12 ${w} rounded-full max-md:h-9 max-md:w-24`} />
            ))}
            <div className="mt-6 flex flex-col gap-2 max-md:hidden">
              <Skeleton className="h-10 w-full rounded-full" />
              <Skeleton className="h-10 w-full rounded-full" />
            </div>
          </div>
          {/* the navy panel: the name and description, then the section's fields */}
          <div className="min-h-0 w-4/5 px-2 pb-2 max-md:w-full max-md:flex-1 max-md:px-0 max-md:pb-0">
            <div className="border-neutral-2 bg-primary-9 flex h-full flex-col gap-8 rounded-2xl border p-10 pt-6 max-md:p-4">
              <div className="flex flex-col gap-3">
                <div className="h-9 w-2/5 animate-pulse rounded-full bg-white/15" />
                <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/10" />
                <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/10" />
              </div>
              <div className="grid grid-cols-3 gap-8 max-md:grid-cols-2 max-md:gap-4">
                {['a', 'b', 'c', 'd', 'e', 'f'].map((k) => (
                  <div key={k} className="flex flex-col gap-2">
                    <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
                    <div className="h-5 w-32 animate-pulse rounded-full bg-white/15" />
                  </div>
                ))}
              </div>
              <div className="min-h-0 flex-1 animate-pulse rounded-2xl bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
