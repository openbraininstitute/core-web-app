'use client';

import dynamic from 'next/dynamic';
import { ErrorBoundary } from 'react-error-boundary';

import { withErrorConfig } from '@/components/GenericErrorFallback';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

// The viewer pulls in a web worker and h5wasm (color-by, nodes table), neither of
// which survives SSR, so it must not be part of the server bundle.
const CircuitPreview = dynamic(
  () => import('@/features/circuit-viewer').then((m) => m.CircuitPreview),
  { ssr: false }
);

export function CircuitDetailViewer({ circuit }: { circuit: ICircuit }) {
  if (!circuit) return null;

  return (
    // The Overview panel is `bg-primary-9 text-white`; the viewer draws its own
    // white surfaces (nodes table, chrome), so pin the text colour back to dark.
    <div className="mb-8 h-[min(360px,42vh)] min-h-[260px] w-full overflow-hidden rounded-2xl border border-neutral-2 bg-white text-primary-9">
      <ErrorBoundary
        FallbackComponent={withErrorConfig({
          cls: { container: 'bg-white' },
          showButtons: false,
          customError: 'Error while loading circuit viewer',
        })}
      >
        <CircuitPreview circuit={circuit} enableVisualization />
      </ErrorBoundary>
    </div>
  );
}
