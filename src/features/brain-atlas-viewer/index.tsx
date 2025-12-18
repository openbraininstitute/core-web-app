'use client';

import { ReactNode, useMemo, useState } from 'react';
import { match } from 'ts-pattern';

import { withErrorConfig } from '@/components/GenericErrorFallback';
import { Loader } from '@/components/loader';
import { BrainAtlasViewerGltf } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf';
import { FullScreen } from '@/features/brain-atlas-viewer/full-screen';
import { ErrorBoundary } from 'react-error-boundary';

export function AtlasViewer({ dataKey, children }: { dataKey: string; children?: ReactNode }) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const handleFullScreenToggle = () => {
    setIsFullScreen((prev) => !prev);
  };

  const renderViewer = useMemo(
    () => (
      <ErrorBoundary
        FallbackComponent={withErrorConfig({
          cls: { container: 'bg-primary-9/40' },
          customError: 'Failed to show visualization',
          showButtons: false,
        })}
      >
        <BrainAtlasViewerGltf dataKey={dataKey} onLoading={setIsLoading} />
      </ErrorBoundary>
    ),
    [dataKey]
  );

  return match(isFullScreen)
    .with(true, () => {
      return (
        <div className="fixed inset-0 z-[9999] bg-black">
          <FullScreen isFullScreen={isFullScreen} onToggle={handleFullScreenToggle} />
          {isLoading && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/5">
              <Loader className="text-neutral-3" />
            </div>
          )}
          <div className="relative h-full w-full">{renderViewer}</div>
        </div>
      );
    })
    .otherwise(() => {
      return (
        <div className="@container relative flex h-full max-h-full w-full max-w-full flex-col items-start lg:flex-row">
          <FullScreen isFullScreen={isFullScreen} onToggle={handleFullScreenToggle} />
          <div className="relative h-1/2 w-full min-w-0 rounded-2xl lg:h-full lg:min-h-0 lg:flex-[2]">
            {isLoading && (
              <div className="bg-primary-9/40 pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl">
                <Loader className="text-neutral-3" />
              </div>
            )}
            {renderViewer}
          </div>
          <div className="relative h-1/2 w-full min-w-0 lg:h-full lg:min-h-0 lg:flex-1">
            {children}
          </div>
        </div>
      );
    });
}

export default AtlasViewer;
