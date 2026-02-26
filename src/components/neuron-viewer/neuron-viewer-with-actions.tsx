'use client';

import { MorphoViewerSimul, morphoViewerConvertMorphologyIntoTree } from '@bbp/morphoviewer';
import { useAtomValue } from 'jotai';
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

import ReloadIcon from '../icons/Reload';
import { DebugPanel } from './debug-panel';
import { useElectrodes } from './hooks/electrodes';
import { useSynapses } from './hooks/synapses';
import { NeuronLoader } from './plugins/neuron-loader';

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
  const tree = React.useMemo(
    () => morphoViewerConvertMorphologyIntoTree(morphology, 'Cell'),
    [morphology]
  );
  const { recordings, setRecordings, injection, setInjection } = useElectrodes(
    sessionId,
    disableElectrodes
  );
  const synapses = useSynapses(sessionId, disableSynapses);
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
        <MorphoViewerSimul
          morphology={tree}
          synapses={synapses}
          recordings={disableElectrodes ? [] : recordings}
          onRecordingsChange={disableElectrodes ? undefined : setRecordings}
          injection={disableElectrodes ? undefined : injection}
          onInjectionChange={disableElectrodes ? undefined : setInjection}
          disableClick={simulationStatus?.status === SimulationStatus.LAUNCHED}
        />
        <DebugPanel morphology={morphology} synapses={synapses} />
      </DefaultLoadingSuspense>
    </ErrorBoundary>
  );
}

export default NeuronViewerContainer;
