'use client';

import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useAtomValue } from 'jotai';

import ReloadIcon from '../icons/Reload';
import { ViewerDendrogram } from '../viewers/viewer-dendrogram';
import { NeuronLoader } from './plugins/neuron-loader';

import { DefaultLoadingSuspense } from '@/components/DefaultLoadingSuspense';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { WebglNeuronSelector } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/webgl-neuron-selector';
import { useCleanMorphology } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/hooks';
import { logError } from '@/utils/logger';
import {
  SimulationStatus,
  simulationStatusAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';

import styles from './neuron-viewer-with-actions.module.css';

type Props = {
  meModelId: string;
  sessionId: string;
  disableElectrodes?: boolean;
  disableSynapses?: boolean;
};

export function NeuronViewerContainer({
  meModelId,
  sessionId,
  disableElectrodes,
  disableSynapses,
}: Props) {
  const simulationStatus = useAtomValue(simulationStatusAtomFamily(sessionId));
  const { loading, error, morphology } = useCleanMorphology(meModelId, sessionId);

  if (error) {
    logError('Unable to load morphology:', error);
    throw new Error('Unable to load morphology!');
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <NeuronLoader text="Loading Neuron" />
      </div>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={withErrorConfig({
        showButtons: false,
        cls: {
          container: 'rounded-xl bg-transparent border border-neutral-2',
          error: '[&_h2]:text-primary-8 bg-transparent px-0',
        },
        children: (
          <div className={styles.reloadButton}>
            <button type="button" onClick={() => document.location.reload()}>
              <ReloadIcon />
              Reload the page
            </button>
          </div>
        ),
      })}
    >
      <DefaultLoadingSuspense>
        <WebglNeuronSelector
          morphology={morphology}
          sessionId={sessionId}
          disableElectrodes={disableElectrodes}
          disableSynapses={disableSynapses}
          disableClick={simulationStatus?.status === SimulationStatus.LAUNCHED}
        />
        <ViewerDendrogram morphology={morphology} />
      </DefaultLoadingSuspense>
    </ErrorBoundary>
  );
}

export default NeuronViewerContainer;
