import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { Vector3 } from 'three';

import LoadingHandler from '@/features/brain-atlas-viewer/loading-handler';
import ViewerComposer from '@/features/brain-atlas-viewer/viewer-composer';
import FullScreen from '@/features/brain-atlas-viewer/full-screen';

import { sectionAtom } from '@/state/application';

export default function ThreeDeeBrain({ dataKey }: { dataKey: string }) {
  const threeDRef = useRef<HTMLDivElement>(null);
  const section = useAtomValue(sectionAtom);

  if (!section) {
    return null;
  }

  return (
    <div ref={threeDRef} className="h-full w-full">
      <LoadingHandler section={section} />
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
        <Suspense fallback={null}>
          <ViewerComposer dataKey={dataKey} section={section} />
        </Suspense>
      </Canvas>
    </div>
  );
}
