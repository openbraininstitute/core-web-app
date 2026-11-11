'use client';

import dynamic from 'next/dynamic';

export const IonChannelRecordingViewer = dynamic(() => import('./ion-channel-recording-viewer'), {
  ssr: false,
});

export default IonChannelRecordingViewer;
