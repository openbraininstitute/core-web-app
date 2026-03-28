'use client';

import dynamic from 'next/dynamic';

export const SpikeViewer = dynamic(() => import('./spike-viewer'), { ssr: false });

export default SpikeViewer;
