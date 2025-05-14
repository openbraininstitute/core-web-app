import { ErrorBoundary } from 'react-error-boundary';
import { LoadingOutlined } from '@ant-design/icons';
import { Suspense } from 'react';
import { Spin } from 'antd';

import { withErrorConfig } from '@/components/GenericErrorFallback';
import { METypeDetails } from '@/features/cell-composition/elements/m-e-type-tree';

export default function CellCompositionExplorer() {
  return (
    <ErrorBoundary
      FallbackComponent={withErrorConfig({
        customError: 'failed to load cell composition',
        showButtons: false,
      })}
    >
      <Suspense
        fallback={
          <Spin
            size="large"
            indicator={<LoadingOutlined />}
            className="text-neutral-3 absolute top-1/2 left-1/2"
          />
        }
      >
        <div className="flex h-full w-full min-w-[300px] flex-col gap-5 py-8 pb-0 text-white">
          <METypeDetails />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
