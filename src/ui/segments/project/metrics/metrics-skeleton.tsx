/* eslint-disable react/jsx-props-no-spreading */

import { Card, CardContent } from '@/ui/molecules/card';
import { cn } from '@/utils/css-class';

type BarProps = { className?: string; 'aria-label'?: string };

export function Bar({ className, ...props }: BarProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      {...props}
      className={cn(
        'relative overflow-hidden rounded-md bg-neutral-200 dark:bg-neutral-800',
        'h-5',
        className,
      )}
    >
      <span className="sr-only">Loading</span>
      <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite_linear] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)]" />
      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

export function MetricsSkeleton({
  cls,
}: {
  cls?: {
    container?: React.ComponentProps<'div'>['className'];
    body?: React.ComponentProps<'div'>['className'];
  };
}) {
  return (
    <Card className={cn(cls?.container)}>
      <CardContent>
        <div className={cn(cls?.body)}>
          <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2">
            <Bar aria-label="Loading label" className="w-2/3" />
            <Bar aria-label="Loading count" className="h-3 w-6" />
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2">
            <Bar aria-label="Loading label" className="w-2/3" />
            <Bar aria-label="Loading count" className="h-3 w-6" />
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2">
            <Bar aria-label="Loading label" className="w-2/3" />
            <Bar aria-label="Loading count" className="h-3 w-6" />
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2">
            <Bar aria-label="Loading label" className="w-2/3" />
            <Bar aria-label="Loading count" className="h-3 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
