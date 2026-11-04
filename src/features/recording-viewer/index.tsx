'use client';

import dynamic from 'next/dynamic';

export const RecordingViewer = dynamic(() => import('./recording-viewer'), { ssr: false });

export type { RecordingSource } from './types';
export default RecordingViewer;
