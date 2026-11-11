'use client';

import dynamic from 'next/dynamic';

import { LoadingNeuronSpinner } from './loading-neuron-spinner';

import styles from './neuron-viewer-with-actions.module.css';

// loaded after hydration: the 3D viewer (morphoviewer + tgd wasm) is ~300 KiB gz; the fallback is the viewer's own loading state
export const NeuronViewerContainer = dynamic(
  () => import('./neuron-viewer-with-actions').then((m) => m.NeuronViewerContainer),
  {
    ssr: false,
    loading: () => (
      <div className={styles.viewerContainer}>
        <LoadingNeuronSpinner />
      </div>
    ),
  }
);
