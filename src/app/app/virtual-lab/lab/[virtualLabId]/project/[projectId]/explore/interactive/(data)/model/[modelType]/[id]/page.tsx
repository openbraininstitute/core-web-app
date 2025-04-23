'use client';
import { use } from 'react';

import dynamic from 'next/dynamic';

import { ModelTypeNames } from '@/constants/explore-section/data-types/model-data-types';

const EModelDetailView = dynamic(() => import('@/features/entities/e-model/detail-view/view'));
const MEModelDetailView = dynamic(() => import('@/features/entities/me-model/detail-view/view'));
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

  console.log('ᦨ #  page.tsx:26 #  DetailPage #  params:', params);

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
