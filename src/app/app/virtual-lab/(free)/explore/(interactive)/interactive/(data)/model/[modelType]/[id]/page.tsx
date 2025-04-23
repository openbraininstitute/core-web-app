'use client';
import { use } from 'react';

import dynamic from 'next/dynamic';

import { ModelTypeNames } from '@/constants/explore-section/data-types/model-data-types';

const EModelDetailView = dynamic(() => import('@/features/entities/e-model/detail-view/view'));
const MEModelDetailView = dynamic(() => import('@/features/entities/me-model/detail-view/view'));
const SynaptomeDetailView = dynamic(
  () => import('@/components/explore-section/Synaptome/DetailView')
);
// const CircuitDetailView = dynamic(() => import('@/components/explore-section/Circuit/DetailView'));

type Params = {
  params: Promise<{
    id: string;
    modelType: ModelTypeNames;
    projectId: string;
    virtualLabId: string;
  }>;
};

export default function DetailPage(props: Params) {
  const params = use(props.params);
  switch (params.modelType) {
    case 'e-model':
      return <EModelDetailView params={params} />;
    case 'me-model':
      return <MEModelDetailView params={params} showViewMode />;
    case 'synaptome':
      return <SynaptomeDetailView params={params} showViewMode />;
    case 'circuit':
      return null;
    // return <CircuitDetailView params={params} />;
    default:
      break;
  }
}
