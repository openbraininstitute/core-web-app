'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { match } from 'ts-pattern';
import { Vector3 } from 'three';

import ViewerComposer from '@/features/brain-atlas-viewer/viewer-composer';
import FullScreen from '@/features/brain-atlas-viewer/full-screen';
import Loader from '@/components/loader';

import type { TSuspenseStatus } from '@/components/suspense-with-status';

export function AtlasViewer({ dataKey }: { dataKey: string }) {
  const threeDRef = useRef<HTMLDivElement>(null);
  const [meshLoadingStatus, setMeshLoadingStatus] = useState<TSuspenseStatus>('pending');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [pointCloudLoadingStatus, setPointCloudLoadingStatus] =
    useState<TSuspenseStatus>('pending');

  // Track container size using ResizeObserver to ensure the Canvas always fits its parent
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const element = threeDRef.current;
    if (!element) return;

    // Initialize with current size
    const rect = element.getBoundingClientRect();
    setContainerSize({ width: Math.floor(rect.width) - 10, height: Math.floor(rect.height) });

    // Observe size changes
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerSize({ width: Math.floor(width) - 10, height: Math.floor(height) });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [isFullScreen]);

  const onMeshLoadingStatusChange = useCallback((status: TSuspenseStatus) => {
    setMeshLoadingStatus(status);
  }, []);

  const onPointCloudLoadingStatusChange = useCallback((status: TSuspenseStatus) => {
    setPointCloudLoadingStatus(status);
  }, []);

  const handleFullScreenToggle = () => {
    setIsFullScreen((prev) => !prev);
  };

  const isLoading = meshLoadingStatus === 'pending' || pointCloudLoadingStatus === 'pending';

  const renderViewer = useMemo(
    () => (
      <>
        <Canvas
          dpr={[1, 2]}
          style={{ width: containerSize.width, height: containerSize.height, display: 'block' }}
          camera={{
            position: [506.098, 1683.079, -14311.903],
            up: [0, -1, 0],
            fov: 55,
            far: 100000,
            zoom: 1.3,
            type: 'PerspectiveCamera',
          }}
        >
          <OrbitControls target={new Vector3(6612.504, 3938.164, 5712.791)} zoomSpeed={0.3} />
          <ViewerComposer
            dataKey={dataKey}
            onMeshLoadingStatusChange={onMeshLoadingStatusChange}
            onPointCloudLoadingStatusChange={onPointCloudLoadingStatusChange}
          />
        </Canvas>
      </>
    ),
    [
      dataKey,
      onMeshLoadingStatusChange,
      onPointCloudLoadingStatusChange,
      containerSize.width,
      containerSize.height,
    ]
  );

  return match(isFullScreen)
    .with(true, () => {
      return (
        <div className="fixed inset-0 z-[9999] bg-black">
          <FullScreen isFullScreen={isFullScreen} onToggle={handleFullScreenToggle} />
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/5">
              <Loader className="text-neutral-3" />
            </div>
          )}
          <div ref={threeDRef} className="relative h-full w-full">
            {renderViewer}
          </div>
        </div>
      );
    })
    .otherwise(() => {
      return (
        <div ref={threeDRef} className="relative h-full max-h-full w-full max-w-full">
          <FullScreen isFullScreen={isFullScreen} onToggle={handleFullScreenToggle} />
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/5">
              <Loader className="text-neutral-3" />
            </div>
          )}
          {renderViewer}
        </div>
      );
    });
}

export default AtlasViewer;
