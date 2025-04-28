'use client';

import { notFound } from 'next/navigation';
import { use, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import dynamic from 'next/dynamic';

import { DataType } from '@/constants/explore-section/list-views';
import { MODEL_DATA_TYPE_CONFIG } from '@/constants/explore-section/data-types/model-data-types';
import { ExploreDataScope } from '@/types/explore-section/application';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { backToListPathAtom } from '@/state/explore-section/detail-view-atoms';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

const ExploreEModelTable = dynamic(() => import('@/features/entities/e-model/listing-view'));
const ExploreMEModelTable = dynamic(() => import('@/features/entities/me-model/listing-view'));
const ExploreSynaptomeModelTable = dynamic(
  () => import('@/features/entities/single-neuron-synaptome/listing-view')
);

export default function VirtualLabModelListingView({
  params: urlParams,
}: ServerSideComponentProp<WorkspaceContext & { modelType: string }, null>) {
  const { virtualLabId, projectId, modelType } = use(urlParams);

  const currentModel = Object.keys(MODEL_DATA_TYPE_CONFIG).find(
    (key) => MODEL_DATA_TYPE_CONFIG[key].name === modelType
  );

  const setBackToListPath = useSetAtom(backToListPathAtom);
  const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);

  useEffect(() => {
    resolveExploreDetailsPageUrl({
      ctx: { virtualLabId, projectId },
    });
    setBackToListPath(`${vlProjectUrl}/explore/interactive`);
  }, [setBackToListPath, vlProjectUrl]);

  if (!currentModel) notFound();

  switch (currentModel as DataType) {
    case DataType.CircuitEModel:
      return (
        <ExploreEModelTable
          virtualLabInfo={{ virtualLabId, projectId }}
          dataType={currentModel as DataType}
          dataScope={ExploreDataScope.SelectedBrainRegion}
        />
      );
    case DataType.CircuitMEModel:
      return (
        <ExploreMEModelTable
          virtualLabInfo={{ virtualLabId, projectId }}
          dataType={currentModel as DataType}
          dataScope={ExploreDataScope.SelectedBrainRegion}
        />
      );
    case DataType.SingleNeuronSynaptome:
      return (
        <ExploreSynaptomeModelTable
          virtualLabInfo={{ virtualLabId, projectId }}
          dataType={currentModel as DataType}
          dataScope={ExploreDataScope.SelectedBrainRegion}
        />
      );
    default:
      notFound();
  }
}
