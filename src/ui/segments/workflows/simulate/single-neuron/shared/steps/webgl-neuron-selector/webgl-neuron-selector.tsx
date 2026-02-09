import React from 'react';

import AddRecordingDialog from './add-recording-dialog';
import { ButtonResetCamera } from './button-reset-camera';
import { HintPanel } from './hint';
import LegendOverlay from './legend-overlay';
import { type PainterManager, usePainterController, usePainterManager } from './painter';
import ZoomSlider from './zoom-slider';

import type { Morphology } from '@/services/bluenaas-single-cell/types';

import styles from './webgl-neuron-selector.module.css';

export interface WebglNeuronSelectorProps {
  morphology: Morphology;
  sessionId: string;
  disableElectrodes?: boolean;
  disableSynapses?: boolean;
  disableClick?: boolean;
}

export const WebglNeuronSelector = React.memo(
  ({
    morphology,
    sessionId,
    disableElectrodes,
    disableSynapses,
    disableClick,
  }: WebglNeuronSelectorProps) => {
    const painterManager = usePainterManager(morphology);
    return (
      <WebglNeuronSelectorContent
        painterManager={painterManager}
        sessionId={sessionId}
        disableElectrodes={disableElectrodes ?? false}
        disableSynapses={disableSynapses ?? false}
        disableClick={disableClick ?? false}
      />
    );
  }
);

type WebglNeuronSelectorContentProps = {
  painterManager: PainterManager;
  sessionId: string;
  disableElectrodes: boolean;
  disableSynapses: boolean;
  disableClick: boolean;
};

function WebglNeuronSelectorContent({
  painterManager,
  sessionId,
  disableElectrodes,
  disableSynapses,
  disableClick,
}: WebglNeuronSelectorContentProps) {
  usePainterController(painterManager, disableElectrodes, disableSynapses, disableClick);

  return (
    <div className={styles.main}>
      <canvas
        key="canvas"
        ref={(canvas: HTMLCanvasElement | null) => {
          painterManager.canvas = canvas;
          return () => {
            painterManager.canvas = null;
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
    </div>
  );
}
