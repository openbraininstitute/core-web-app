'use client';

import dynamic from 'next/dynamic';

export const SonataViewer = dynamic(() => import('./sonata-viewer'), { ssr: false });

export default SonataViewer;
