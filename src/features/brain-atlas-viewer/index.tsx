import { useCallback, useRef, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Vector3 } from 'three';

import ViewerComposer from '@/features/brain-atlas-viewer/viewer-composer';
import FullScreen from '@/features/brain-atlas-viewer/full-screen';
import Loader from '@/components/loader';

import type { TSuspenseStatus } from '@/components/suspense-with-status';

export default function ThreeDeeBrain({ dataKey }: { dataKey: string }) {
  const threeDRef = useRef<HTMLDivElement>(null);
  const [meshLoadingStatus, setMeshLoadingStatus] = useState<TSuspenseStatus>('pending');

  const [pointCloudLoadingStatus, setPointCloudLoadingStatus] =
    useState<TSuspenseStatus>('pending');

  const onMeshLoadingStatusChange = useCallback((status: TSuspenseStatus) => {
    setMeshLoadingStatus(status);
  }, []);

  const onPointCloudLoadingStatusChange = useCallback((status: TSuspenseStatus) => {
    setPointCloudLoadingStatus(status);
  }, []);

  const isLoading = meshLoadingStatus === 'pending' || pointCloudLoadingStatus === 'pending';

  return (
    <div ref={threeDRef} className="relative h-full w-full">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/5">
          <Loader className="text-neutral-3" />
        </div>
      )}
      <FullScreen elementRef={threeDRef} />
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
      >
        <OrbitControls target={new Vector3(6612.504, 3938.164, 5712.791)} zoomSpeed={0.3} />
        <ViewerComposer
          dataKey={dataKey}
          onMeshLoadingStatusChange={onMeshLoadingStatusChange}
          onPointCloudLoadingStatusChange={onPointCloudLoadingStatusChange}
        />
      </Canvas>
    </div>
  );
}
