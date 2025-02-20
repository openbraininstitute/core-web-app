'use client';

import dynamic from 'next/dynamic';

import { ModelTypeNames } from '@/constants/explore-section/data-types/model-data-types';

const EModelDetailView = dynamic(
  () => import('@/components/explore-section/EModel/DetailView/View')
);
const MEModelDetailView = dynamic(
  () => import('@/components/explore-section/MEModel/DetailView/View')
);
const SynaptomeDetailView = dynamic(
  () => import('@/components/explore-section/Synaptome/DetailView')
);

type Params = {
  params: {
    id: string;
    modelType: ModelTypeNames;
    projectId: string;
    virtualLabId: string;
  };
};

export default function DetailPage({ params }: Params) {
  switch (params.modelType) {
    case 'e-model':
      return <EModelDetailView params={params} />;
    case 'me-model':
      return <MEModelDetailView params={params} showViewMode />;
    case 'synaptome':
      return <SynaptomeDetailView params={params} />;
    default:
      break;
  }
}
