'use client';

import dynamic from 'next/dynamic';

const DistributionModalDynamic = dynamic(() => import('./distribution-modal'), { ssr: false });

export default DistributionModalDynamic;
