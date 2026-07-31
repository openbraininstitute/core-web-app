'use client';

import { LoadingOutlined } from '@ant-design/icons';

import { cn } from '@/utils/css-class';

export interface GridLoaderProps {
  /** what is loading — shown as `loading {label}`. Default: `entities`. */
  label?: string;
  className?: string;
}

/**
 * The grid's loading indicator: an antd {@link LoadingOutlined} spinner ABOVE a
 * `loading {label}` line. Deliberately ISOLATED and dependency-light so it can be
 * swapped out anywhere without touching the grids. The container carries NO shadow
 * and the grid background (`bg-background`) so it blends into the table area.
 */
export function GridLoader({ label = 'entities', className }: GridLoaderProps) {
  return (
    <div
      className={cn(
        'bg-background flex h-full w-full flex-col items-center justify-center gap-2 p-6 shadow-none',
        className
      )}
    >
      <LoadingOutlined className="text-primary-7 text-2xl" aria-hidden />
      <span className="text-neutral-4 text-sm">loading {label}</span>
    </div>
  );
}

/** AG Grid `loadingOverlayComponent` adapter — reads `label` from the overlay params. */
export function GridLoaderOverlay(props: { label?: string }) {
  return <GridLoader label={props.label} />;
}
