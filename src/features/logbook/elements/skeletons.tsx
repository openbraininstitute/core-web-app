import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export function Bone({ className }: { readonly className?: string }) {
  return (
    <Skeleton
      as="span"
      active={false}
      className={cn('block rounded-full bg-neutral-2/60', className)}
    />
  );
}

const repeat = (count: number, render: (key: number) => ReactNode) =>
  Array.from({ length: count }, (_, key) => render(key));

function Writers({ ring }: { readonly ring: string }) {
  return (
    <span className="flex">
      <Bone className={cn('size-7 ring-2', ring)} />
      <Bone className={cn('-ml-2 size-7 ring-2', ring)} />
    </span>
  );
}

export function LogCardSkeleton() {
  return (
    <div
      className="flex min-h-[188px] animate-pulse flex-col gap-2 rounded-2xl bg-white p-5 shadow-card"
      aria-hidden="true"
    >
      <span className="flex h-[23px] items-center">
        <Bone className="h-4 w-2/3" />
      </span>
      <span className="flex flex-col gap-[9px] pt-1">
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-11/12" />
        <Bone className="h-3 w-3/5" />
      </span>
      <span className="mt-auto flex items-center gap-3 border-t border-rule-soft pt-3">
        <Writers ring="ring-white" />
        <Bone className="h-2.5 w-20" />
        <Bone className="ml-auto h-2.5 w-12" />
      </span>
    </div>
  );
}

export function LogPillSkeleton() {
  return (
    <div
      className="flex animate-pulse flex-col gap-1 rounded-[12px] bg-neutral-1 p-[12px_14px_12px_16px]"
      aria-hidden="true"
    >
      <span className="flex h-[22px] items-center">
        <Bone className="h-3.5 w-3/5" />
      </span>
      <span className="flex h-[18px] items-center">
        <Bone className="h-2.5 w-full" />
      </span>
      <span className="flex h-[18px] items-center">
        <Bone className="h-2.5 w-4/5" />
      </span>
      <span className="mt-1 flex items-center gap-2">
        <Writers ring="ring-neutral-1" />
        <Bone className="ml-auto h-2.5 w-12" />
      </span>
    </div>
  );
}

export function CardSkeletons({ count }: { readonly count: number }) {
  return repeat(count, (key) => <LogCardSkeleton key={key} />);
}
export function PillSkeletons({ count }: { readonly count: number }) {
  return repeat(count, (key) => <LogPillSkeleton key={key} />);
}

const LINES = ['w-full', 'w-11/12', 'w-4/5', 'w-[97%]', 'w-3/5'] as const;

export function LinesSkeleton({ count = 3 }: { readonly count?: number }) {
  return (
    <span className="flex animate-pulse flex-col gap-2.5" aria-hidden="true">
      {LINES.slice(0, count).map((width) => (
        <Bone key={width} className={cn('h-3', width)} />
      ))}
    </span>
  );
}

export function PageSkeleton() {
  return (
    <section
      className="logbook-card flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-busy="true"
      aria-label="Opening the log"
    >
      <span className="flex animate-pulse items-center gap-3 border-b border-rule-soft px-6 py-4">
        <Bone className="h-5 w-2/5" />
        <Bone className="ml-auto size-[34px]" />
        <Bone className="size-[34px]" />
      </span>
      <span className="flex flex-col gap-8 px-[clamp(24px,8%,96px)] py-10">
        <Bone className="h-7 w-3/5 animate-pulse" />
        <LinesSkeleton count={5} />
        <LinesSkeleton count={3} />
      </span>
    </section>
  );
}

export function BoardSkeleton({ withLog }: { readonly withLog: boolean }) {
  return (
    <div
      className="flex h-full gap-4 bg-background py-px pr-1 pl-3"
      role="status"
      aria-busy="true"
      aria-label="Loading the research logs"
    >
      {withLog ? (
        <>
          <aside className="logbook-card flex w-[364px] flex-none flex-col gap-3 p-3 max-lg:hidden">
            <Bone className="h-10 w-full animate-pulse" />
            <PillSkeletons count={5} />
          </aside>
          <PageSkeleton />
        </>
      ) : (
        <section className="logbook-card flex min-h-0 flex-1 flex-col overflow-hidden">
          <span className="flex animate-pulse items-center gap-3 border-b border-rule px-6 py-4">
            <span className="mr-auto flex flex-col gap-2">
              <Bone className="h-5 w-44" />
              <Bone className="h-3 w-16" />
            </span>
            <Bone className="h-10 w-[260px] max-md:hidden" />
            <Bone className="h-10 w-32" />
          </span>
          <span className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-6 max-md:p-4">
            <CardSkeletons count={6} />
          </span>
        </section>
      )}
    </div>
  );
}

export function RowsSkeleton({ count = 4 }: { readonly count?: number }) {
  return (
    <span className="flex animate-pulse flex-col gap-2" aria-hidden="true">
      {repeat(count, (key) => (
        <span key={key} className="flex items-center gap-3 rounded-[12px] px-2 py-2">
          <Bone className="size-9 flex-none rounded-[10px]" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <Bone className="h-3 w-1/2" />
            <Bone className="h-2.5 w-1/3" />
          </span>
        </span>
      ))}
    </span>
  );
}

export function PanelSkeleton() {
  return (
    <section
      className="logbook-card flex h-full animate-pulse flex-col gap-5 p-6"
      aria-busy="true"
      aria-label="Loading the details"
    >
      <span className="flex items-center gap-3">
        <Bone className="h-5 w-2/3" />
        <Bone className="ml-auto size-8" />
      </span>
      <Bone className="h-40 w-full rounded-2xl" />
      <LinesSkeleton count={5} />
    </section>
  );
}
