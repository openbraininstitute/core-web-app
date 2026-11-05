'use client';

import dynamic from 'next/dynamic';

export const LfpViewer = dynamic(() => import('./lfp-viewer').then((m) => m.LfpViewer), {
  ssr: false,
});
