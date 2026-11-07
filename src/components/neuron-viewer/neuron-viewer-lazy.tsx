'use client';

import dynamic from 'next/dynamic';

/** Lazy NeuronViewerContainer: the 3D viewer (morphoviewer + tgd wasm, ~300 KiB gz) loads on the client after hydration. */
export const NeuronViewerContainer = dynamic(
  () => import('./neuron-viewer-with-actions').then((m) => m.NeuronViewerContainer),
  { ssr: false }
);
