import { useEffect, useMemo, useRef, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { match } from 'ts-pattern';
import { Vector3 } from 'three';

import ViewerComposer from '@/features/brain-atlas-viewer/viewer-composer';
import FullScreen from '@/features/brain-atlas-viewer/full-screen';
import Loader from '@/components/loader';

export function AtlasViewer({ dataKey }: { dataKey: string }) {
  const threeDRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 0);
    return () => clearTimeout(t);
  }, []);

  const handleFullScreenToggle = () => {
    setIsFullScreen((prev) => !prev);
  };

  const renderViewer = useMemo(
    () => (
      <>
        <Canvas
          dpr={[1, 2]}
          camera={{
            position: [506.098, 1683.079, -14311.903],
            up: [0, -1, 0],
            fov: 55,
            far: 100000,
            zoom: 1.3,
            type: 'PerspectiveCamera',
          }}
          resize={{ debounce: 16 }}
        >
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            enableDamping
            zoomSpeed={0.3}
            dampingFactor={0.05}
            target={new Vector3(6612.504, 3938.164, 5712.791)}
          />
          <ViewerComposer
            dataKey={dataKey}
            onLoadingChange={(_type, loading) => {
              setIsLoading(loading);
            }}
          />
        </Canvas>
      </>
    ),
    [dataKey]
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
        <div className="relative flex h-full max-h-full w-full max-w-full flex-col items-start">
          <FullScreen isFullScreen={isFullScreen} onToggle={handleFullScreenToggle} />
          <div ref={threeDRef} className="relative w-full min-w-0 rounded-2xl lg:h-full lg:min-h-0">
            {isLoading && (
              <div className="bg-primary-9/40 absolute inset-0 z-10 flex items-center justify-center rounded-2xl">
                <Loader className="text-neutral-3" />
              </div>
            )}
            {renderViewer}
          </div>
        </div>
      );
    });
}
