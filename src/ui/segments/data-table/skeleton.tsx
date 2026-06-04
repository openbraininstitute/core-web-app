'use client';

import { useCallback, useLayoutEffect, useState } from 'react';

import useResizeObserver from '@/hooks/useResizeObserver';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

import type { ComponentProps, CSSProperties } from 'react';

/** approximate height of a fully-loaded body row, sized to fit the preview thumbnail */
const ROW_HEIGHT = 112;
const MIN_ROWS = 2;
/** fallback before the body is measured */
const DEFAULT_ROWS = 5;

type ColumnKind = 'control' | 'preview' | 'text';

const COLUMNS: ReadonlyArray<{ width: string; kind: ColumnKind }> = [
  { width: '1.25rem', kind: 'control' },
  { width: '7rem', kind: 'preview' },
  { width: '14%', kind: 'text' },
  { width: '7%', kind: 'text' },
  { width: '18%', kind: 'text' },
  { width: '13%', kind: 'text' },
  { width: '12%', kind: 'text' },
  { width: '11%', kind: 'text' },
];

function ColumnCell({ kind }: { kind: ColumnKind }) {
  if (kind === 'control') {
    return <Skeleton className="size-5 rounded" />;
  }
  if (kind === 'preview') {
    return <Skeleton className="h-16 w-full rounded-md" />;
  }
  return <Skeleton className="h-4 w-full" />;
}

function HeaderCell({ kind }: { kind: ColumnKind }) {
  if (kind === 'control') {
    return <Skeleton className="size-5 rounded" />;
  }
  return <Skeleton className="h-3 w-16" />;
}

function GridRow({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: (column: (typeof COLUMNS)[number], index: number) => React.ReactNode;
}) {
  return (
    <div className={cn('flex items-center gap-6 px-2', className)} style={style}>
      {COLUMNS.map((column, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static column layout, never reordered
          key={index}
          className="shrink-0"
          style={{ width: column.width }}
        >
          {children(column, index)}
        </div>
      ))}
    </div>
  );
}

export function MainTableSkeleton({ className, ...props }: ComponentProps<'section'>) {
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);
  const [rowCount, setRowCount] = useState(DEFAULT_ROWS);

  const measure = useCallback((target: HTMLElement) => {
    const height = target.getBoundingClientRect().height;
    setRowCount(Math.max(MIN_ROWS, Math.floor(height / ROW_HEIGHT)));
  }, []);

  useLayoutEffect(() => {
    if (bodyEl) measure(bodyEl);
  }, [bodyEl, measure]);

  useResizeObserver({ element: bodyEl ?? undefined, callback: measure });

  return (
    <section
      aria-busy="true"
      aria-label="Loading table"
      className={cn('flex h-full w-full min-w-0 flex-col bg-background', className)}
      {...props}
    >
      {/* mirrors TableTools: scope tabs + species/region/search on the
          left, entity-type + filters pills on the right */}
      <div className="mb-5 flex w-full items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <Skeleton className="h-10 w-56 rounded-full" />
          <Skeleton className="h-11 w-104 max-w-full rounded-full" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-10 w-40 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
      </div>

      <div className="flex min-h-0 grow flex-col overflow-hidden">
        {/* column header */}
        <GridRow className="border-b border-gray-200 py-4">
          {(column, index) => <HeaderCell key={index} kind={column.kind} />}
        </GridRow>
        {/* body — row count derived from available height */}
        <div ref={setBodyEl} className="min-h-0 grow overflow-hidden">
          {Array.from({ length: rowCount }, (_, rowIndex) => (
            <GridRow
              // biome-ignore lint/suspicious/noArrayIndexKey: static decorative rows, never reordered
              key={rowIndex}
              className="border-b border-gray-100"
              style={{ height: ROW_HEIGHT }}
            >
              {(column, index) => <ColumnCell key={index} kind={column.kind} />}
            </GridRow>
          ))}
        </div>
      </div>

      {/* pagination footer — centered page controls */}
      <div className="flex w-full items-center justify-center gap-2 py-3">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="h-3 w-6" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
    </section>
  );
}
