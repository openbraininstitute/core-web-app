'use client';

import dynamic from 'next/dynamic';

export const EphysViewer = dynamic(() => import('./ephys-viewer'), { ssr: false });

export { default as EphysViewerSkeleton } from './components/ephys-viewer-skeleton';
export { default as EphysOptionSelect } from './components/option-select';
export { TraceViewMode } from './components/trace-view-mode-toggle';

export default EphysViewer;
