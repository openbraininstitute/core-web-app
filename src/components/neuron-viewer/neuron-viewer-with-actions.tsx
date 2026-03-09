'use client';

import { useAtomValue } from 'jotai';
import dynamic from 'next/dynamic';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { DefaultLoadingSuspense } from '@/components/DefaultLoadingSuspense';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import {
  SimulationStatus,
  simulationStatusAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { useCleanMorphology } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/hooks';
import { logError } from '@/utils/logger';

const WebglNeuronSelector = dynamic(
  () =>
    import(
      '@/ui/segments/workflows/simulate/single-neuron/shared/steps/webgl-neuron-selector'
    ).then((mod) => mod.WebglNeuronSelector),
  { ssr: false }
);

import { IconGear } from '../ai-assistant/icons/gear';
import ReloadIcon from '../icons/Reload';
import { ViewerDendrogram } from '../viewers/viewer-dendrogram';
import { NeuronLoader } from './plugins/neuron-loader';

import styles from './neuron-viewer-with-actions.module.css';

type Props = {
  meModelId: string;
  sessionId: string;
  disableElectrodes?: boolean;
  disableSynapses?: boolean;
};

const ENABLE_DENDROGRAM = false;

export function NeuronViewerContainer({
  meModelId,
  sessionId,
  disableElectrodes,
  disableSynapses,
}: Props) {
  const [viewer, setViewer] = React.useState<'3D' | 'dendrogram'>('3D');
  const toggleViewer = () => setViewer(viewer === '3D' ? 'dendrogram' : '3D');
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
        {ENABLE_DENDROGRAM && (
          <button className={styles.toggleView} type="button" onClick={toggleViewer}>
            <IconGear />
          </button>
        )}
        {(!ENABLE_DENDROGRAM || viewer === '3D') && (
          <WebglNeuronSelector
            morphology={morphology}
            sessionId={sessionId}
            disableElectrodes={disableElectrodes}
            disableSynapses={disableSynapses}
            disableClick={simulationStatus?.status === SimulationStatus.LAUNCHED}
          />
        )}
        {ENABLE_DENDROGRAM && viewer === 'dendrogram' && (
          <ViewerDendrogram morphology={morphology} />
        )}
      </DefaultLoadingSuspense>
    </ErrorBoundary>
  );
}

export default NeuronViewerContainer;
