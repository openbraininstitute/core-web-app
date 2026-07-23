'use client';

import dynamic from 'next/dynamic';
import { ErrorBoundary } from 'react-error-boundary';

import { withErrorConfig } from '@/components/GenericErrorFallback';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

// CircuitPreview pulls in color-by (web worker + h5wasm), which must stay off the
// server bundle. Match morphology detail: fixed viewport, white surface, soft error.
const CircuitPreview = dynamic(
  () =>
    import('@/features/scan-config/components/model-preview/circuit-preview').then(
      (m) => m.CircuitPreview
    ),
  { ssr: false }
);

/**
 * Interactive 3D circuit viewer for Synaptome (beta) / single-scale circuit
 * detail Overview. Hosts the shared scan-config {@link CircuitPreview} without
 * electrode overlays or form sync.
 */
export function CircuitDetailViewer({ circuit }: { circuit: ICircuit }) {
  if (!circuit) return null;

  return (
    // Overview sits on `bg-primary-9 text-white`; pin dark text so the viewer's
    // white chrome (nodes table, menus) stays readable.
    <div className="mb-8 h-[min(740px,80vh)] min-h-90 w-full overflow-hidden rounded-2xl border border-neutral-2 bg-white text-primary-9">
      <ErrorBoundary
        FallbackComponent={withErrorConfig({
          cls: { container: 'bg-white' },
          showButtons: false,
          customError: 'Error while loading circuit viewer',
        })}
      >
        <CircuitPreview circuit={circuit} enableVisualization enableElectrodes={false} />
      </ErrorBoundary>
    </div>
  );
}
