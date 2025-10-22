'use client';

import dynamic from 'next/dynamic';

export const EphysViewer = dynamic(() => import('./ion-channel-recording-viewer'), { ssr: false });

export default EphysViewer;
