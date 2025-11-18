/* eslint-disable no-param-reassign */
import React from 'react';

import { PainterManager, usePainterController, usePainterManager } from './painter';
import { HintPanel } from './hint';
import ZoomSlider from './zoom-slider';
import { useCleanMorphology } from './hooks';
import LegendOverlay from './legend-overlay';
import { ButtonResetCamera } from './button-reset-camera';

import AddRecordingDialog from './add-recording-dialog';
import { NeuronLoader } from '@/components/neuron-viewer/plugins/neuron-loader';

import styles from './webgl-neuron-selector.module.css';

export interface WebglNeuronSelectorProps {
  projectId: string;
  virtualLabId: string;
  meModelId: string;
  sessionId: string;
  disableElectrodes?: boolean;
  disableSynapses?: boolean;
}

export function WebglNeuronSelector({
  projectId,
  virtualLabId,
  meModelId,
  sessionId,
  disableElectrodes,
  disableSynapses,
}: WebglNeuronSelectorProps) {
  const painterManager = usePainterManager();
  return (
    <WebglNeuronSelectorContent
      painterManager={painterManager}
      projectId={projectId}
      virtualLabId={virtualLabId}
      meModelId={meModelId}
      sessionId={sessionId}
      disableElectrodes={disableElectrodes}
      disableSynapses={disableSynapses}
    />
  );
}

type WebglNeuronSelectorContentProps = WebglNeuronSelectorProps & {
  painterManager: PainterManager;
};

// eslint-disable-next-line react/display-name
const WebglNeuronSelectorContent = React.memo(
  ({
    projectId,
    virtualLabId,
    meModelId,
    sessionId,
    painterManager,
    disableElectrodes = false,
    disableSynapses = false,
  }: WebglNeuronSelectorContentProps) => {
    usePainterController(painterManager, sessionId, disableElectrodes, disableSynapses);
    const { loading, error } = useCleanMorphology(
      painterManager,
      meModelId,
      projectId,
      virtualLabId,
      sessionId
    );
    if (error) return <pre>{JSON.stringify(error, null, 2)}</pre>;

    return (
      <div className={styles.main}>
        {loading ? (
          <Loading />
        ) : (
          <>
            <canvas
              key="canvas"
              ref={(canvas: HTMLCanvasElement | null) => {
                painterManager.canvas = canvas;
                painterManager.initialize();
                return () => {
                  painterManager.delete();
                };
              }}
            />
            <HintPanel painterManager={painterManager} />
            <header>
              <ZoomSlider className={styles.zoomSlider} painterManager={painterManager} />
              <ButtonResetCamera painterManager={painterManager} />
            </header>
            {!disableElectrodes && (
              <LegendOverlay painterManager={painterManager} sessionId={sessionId} />
            )}
            <AddRecordingDialog painterManager={painterManager} sessionId={sessionId} />
          </>
        )}
      </div>
    );
  }
);

function Loading() {
  return (
    <div className={styles.loading}>
      <NeuronLoader text="Loading Neuron" />
    </div>
  );
}
