'use client';

import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { notFound, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

import { DataType } from '@/constants/explore-section/list-views';
import { MODEL_DATA_TYPE_CONFIG } from '@/constants/explore-section/data-types/model-data-types';
import { ExploreDataScope } from '@/types/explore-section/application';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { backToListPathAtom } from '@/state/explore-section/detail-view-atoms';

const ExploreEModelTable = dynamic(() => import('@/features/entities/e-model/listing-view'));
const ExploreMEModelTable = dynamic(() => import('@/features/entities/me-model/listing-view'));
const ExploreSynaptomeModelTable = dynamic(
  () => import('@/features/entities/single-neuron-synaptome/listing-view')
);

export default function VirtualLabModelListingView() {
  const params = useParams<{ modelType: string; virtualLabId: string; projectId: string }>();
  const currentModel = Object.keys(MODEL_DATA_TYPE_CONFIG).find(
    (key) => MODEL_DATA_TYPE_CONFIG[key].name === params?.modelType
  );
  const virtualLabInfo: VirtualLabInfo = {
    virtualLabId: params.virtualLabId,
    projectId: params.projectId,
  };

  const setBackToListPath = useSetAtom(backToListPathAtom);
  const vlProjectUrl = generateVlProjectUrl(virtualLabInfo.virtualLabId, virtualLabInfo.projectId);

  useEffect(() => {
    setBackToListPath(`${vlProjectUrl}/explore/interactive`);
  }, [setBackToListPath, vlProjectUrl]);

  if (!currentModel) notFound();

  switch (currentModel as DataType) {
    case DataType.CircuitEModel:
      return (
        <ExploreEModelTable
          virtualLabInfo={virtualLabInfo}
          dataType={currentModel as DataType}
          dataScope={ExploreDataScope.SelectedBrainRegion}
        />
      );
    case DataType.CircuitMEModel:
      return (
        <ExploreMEModelTable
          virtualLabInfo={virtualLabInfo}
          dataType={currentModel as DataType}
          dataScope={ExploreDataScope.SelectedBrainRegion}
        />
      );
    case DataType.SingleNeuronSynaptome:
      return (
        <ExploreSynaptomeModelTable
          virtualLabInfo={virtualLabInfo}
          dataType={currentModel as DataType}
          dataScope={ExploreDataScope.SelectedBrainRegion}
        />
      );
    default:
      notFound();
  }
}
