'use client';
import { use } from 'react';

import dynamic from 'next/dynamic';

import { ModelTypeNames } from '@/constants/explore-section/data-types/model-data-types';

const EModelDetailView = dynamic(() => import('@/page-wrappers/explore/e-model'));
const MEModelDetailView = dynamic(() => import('@/page-wrappers/explore/me-model'));
const SynaptomeDetailView = dynamic(
  () => import('@/components/explore-section/Synaptome/DetailView')
);

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
      return <MEModelDetailView params={params} />;
    case 'synaptome':
      return <SynaptomeDetailView params={params} />;
    default:
      break;
  }
}
