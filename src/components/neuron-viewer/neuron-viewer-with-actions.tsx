'use client';

import { useAtomValue } from 'jotai';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { DefaultLoadingSuspense } from '@/components/DefaultLoadingSuspense';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { MorphoViewerSingleNeuron, morphoViewerConvertMorphologyIntoTree } from '@/morpho-viewer';
import {
  SimulationStatus,
  simulationStatusAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { useCleanMorphology } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/hooks';
import { cn } from '@/utils/css-class';
import { logError } from '@/utils/logger';

import ReloadIcon from '../icons/Reload';
import { CollapsedViewer } from './collapsed-viewer';
import { DebugPanel } from './debug-panel';
import { useElectrodes } from './hooks/electrodes';
import { useSynapses } from './hooks/synapses';
import { LoadingNeuronSpinner } from './loading-neuron-spinner';

import styles from './neuron-viewer-with-actions.module.css';

type Props = {
  meModelId: string;
  sessionId: string;
  disableElectrodes?: boolean;
  disableSynapses?: boolean;
  /**
   * Fill the parent pane and hide the simulate-layout collapse strip.
   * Scan-config already owns a dedicated right column; collapsing there
   * leaves an empty white gap instead of giving the form more room.
   */
  fillContainer?: boolean;
};

export function NeuronViewerContainer({
  meModelId,
  sessionId,
  disableElectrodes,
  disableSynapses,
  fillContainer,
}: Props) {
  const [collapsed, setCollapsed] = React.useState(false);
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
  const containerClassName = cn(
    styles.viewerContainer,
    fillContainer && styles.fill,
    !fillContainer && collapsed && styles.collapsed
  );

  if (loading)
    return (
      <div className={containerClassName}>
        <LoadingNeuronSpinner />
      </div>
    );

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
            <DebugPanel morphology={morphology} synapses={synapses} />
          </div>
        ),
      })}
    >
      <DefaultLoadingSuspense>
        <div className={containerClassName}>
          {!fillContainer && collapsed ? (
            <CollapsedViewer onClick={() => setCollapsed(false)} />
          ) : (
            <>
              <MorphoViewerSingleNeuron
                morphology={tree}
                synapses={synapses}
                recordings={disableElectrodes ? [] : recordings}
                onRecordingsChange={disableElectrodes ? undefined : setRecordings}
                injection={disableElectrodes ? undefined : injection}
                onInjectionChange={disableElectrodes ? undefined : setInjection}
                disableClick={
                  disableElectrodes || simulationStatus?.status === SimulationStatus.LAUNCHED
                }
                onMinimize={fillContainer ? undefined : () => setCollapsed(true)}
              />
              <DebugPanel morphology={morphology} synapses={synapses} />
            </>
          )}
        </div>
      </DefaultLoadingSuspense>
    </ErrorBoundary>
  );
}

export default NeuronViewerContainer;
