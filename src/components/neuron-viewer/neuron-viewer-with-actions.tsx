'use client';

import { ErrorBoundary } from 'react-error-boundary';

import ReloadIcon from '../icons/Reload';

import { DefaultLoadingSuspense } from '@/components/DefaultLoadingSuspense';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { WebglNeuronSelector } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/webgl-neuron-selector';

import styles from './neuron-viewer-with-actions.module.css';

type Props = {
  meModelId: string;
  disableElectrodes?: boolean;
  disableSynapses?: boolean;
  sessionId: string;
};

export function NeuronViewerContainer({
  meModelId,
  disableElectrodes,
  disableSynapses,
  sessionId,
}: Props) {
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
          disableElectrodes={disableElectrodes}
          disableSynapses={disableSynapses}
          meModelId={meModelId}
          sessionId={sessionId}
        />
      </DefaultLoadingSuspense>
    </ErrorBoundary>
  );
}

export default NeuronViewerContainer;
