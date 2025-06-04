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
      <div className="flex h-full w-full min-w-[300px] flex-col gap-5 py-8 pb-0 text-white">
        <CellCompositionMETypeTree />
      </div>
    </ErrorBoundary>
  );
}
