import React from 'react';
import { LoadingOutlined } from '@ant-design/icons';

import { usePainterManager } from './painter';

import Hint from './hint';
import { useMorphology } from '@/hooks/use-morphology';
import { Morphology } from '@/services/bluenaas-single-cell/types';

import styles from './webgl-neuron-selector.module.css';

export interface WebglNeuronSelectorProps {
  projectId: string;
  virtualLabId: string;
  meModelId: string;
}

export function WebglNeuronSelector({
  projectId,
  virtualLabId,
  meModelId,
  // sessionId,
}: WebglNeuronSelectorProps) {
  const [morphology, setMorphology] = React.useState<Morphology | null>(null);
  const painterManager = usePainterManager(morphology);
  const { loading, error } = useMorphology({
    modelId: meModelId,
    callback: setMorphology,
    projectId,
    virtualLabId,
  });
  if (error) return <pre>{JSON.stringify(error, null, 2)}</pre>;
  if (loading) return <Loading />;

  return (
    <div className={styles.main}>
      <canvas
        key="canvas"
        ref={(canvas: HTMLCanvasElement | null) => {
          painterManager.canvas = canvas;
        }}
      />
      <Hint painterManager={painterManager} />
    </div>
  );
}

function Loading() {
  return (
    <div className="text-neutral-1 flex items-center justify-center text-3xl">
      <LoadingOutlined />
    </div>
  );
}
