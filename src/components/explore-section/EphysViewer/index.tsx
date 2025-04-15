import dynamic from 'next/dynamic';

const EphysViewer = dynamic(() => import('./EphysViewer'), { ssr: false });

export default EphysViewer;
