'use client';

import { ErrorBoundary } from 'react-error-boundary';
import type { ReactNode } from 'react';

import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { AtlasViewer } from '@/features/brain-atlas-viewer';

type Props = {
  dataKey: string;
  children: ReactNode;
};

export function Atlas({ dataKey, children }: Props) {
  const { node: brainRegionNode } = useBrainRegionHierarchy({ dataKey });

  return (
    <div id="3d-area" className="3d bg-primary-9 relative h-full w-full rounded-2xl p-1">
      <ErrorBoundary
        FallbackComponent={withErrorConfig({
          customError: 'failed to load atlas viewer',
          showButtons: false,
          cls: {
            container:
              'absolute inset-0 flex items-center justify-center bg-black/5 h-full! rounded-md',
          },
        })}
        resetKeys={[brainRegionNode.id, brainRegionNode.annotation_value, dataKey]}
      >
        <AtlasViewer dataKey={dataKey}>{children}</AtlasViewer>
      </ErrorBoundary>
    </div>
  );
}
