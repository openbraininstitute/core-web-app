'use client';

import dynamic from 'next/dynamic';

export const EphysViewer = dynamic(() => import('./ephys-viewer'), { ssr: false });

export default EphysViewer;
