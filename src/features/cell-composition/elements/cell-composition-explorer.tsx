'use client';

import { ErrorBoundary } from 'react-error-boundary';

import { CellCompositionMETypeTree } from '@/features/cell-composition/elements/m-e-type-tree';
import { withErrorConfig } from '@/components/GenericErrorFallback';

export default function CellCompositionExplorer() {
  return (
    <ErrorBoundary
      FallbackComponent={withErrorConfig({
        customError: 'failed to load cell composition',
        showButtons: false,
      })}
    >
      <div className="absolute top-0 right-0 flex h-[calc(100%-40px)] w-full flex-col gap-5 px-4 py-8 pb-0 text-white">
        <CellCompositionMETypeTree />
      </div>
    </ErrorBoundary>
  );
}
