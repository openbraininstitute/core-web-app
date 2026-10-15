'use client';

import { ErrorBoundary } from 'react-error-boundary';

import { withErrorConfig } from '@/components/GenericErrorFallback';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/** A viewer's card on an Overview, as tall as the circuit viewer: its chrome and menus need the room. */
export function ViewerCard({
  error,
  className,
  children,
}: {
  error: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'h-[min(740px,80vh)] min-h-90 w-full overflow-hidden rounded-2xl border border-white/20 text-primary-9',
        className
      )}
    >
      <div className="h-full bg-white">
        <ErrorBoundary
          FallbackComponent={withErrorConfig({
            cls: { container: 'bg-white' },
            showButtons: false,
            customError: error,
          })}
        >
          {children}
        </ErrorBoundary>
      </div>
    </div>
  );
}
