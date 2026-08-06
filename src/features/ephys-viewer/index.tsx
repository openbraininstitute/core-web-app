'use client';

import dynamic from 'next/dynamic';

export const EphysViewer = dynamic(() => import('./ephys-viewer'), { ssr: false });

/**
 * The viewer's loading placeholder, and the view constant that shapes it. Exported so a host
 * that resolves the recording itself shows the same layout while it does, instead of a block
 * that the viewer's own skeleton then replaces with a different one.
 */
export { default as EphysViewerSkeleton } from './components/ephys-viewer-skeleton';
/**
 * The viewer's own labelled select. Exported so a host supplying `detailControls` renders its
 * control with the same label, sub-label and box as the Protocol and Repetition ones it sits
 * beside — a near-miss copy is more obvious in that row than anywhere else on the page.
 */
export { default as EphysOptionSelect } from './components/option-select';
export { TraceViewMode } from './components/trace-view-mode-toggle';

export default EphysViewer;
