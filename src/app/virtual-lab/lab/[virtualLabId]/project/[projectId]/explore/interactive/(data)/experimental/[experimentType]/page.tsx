'use client';

import { notFound, useParams } from 'next/navigation';
import { EXPERIMENT_DATA_TYPES } from '@/constants/explore-section/data-types/experiment-data-types';
import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';
import { DataType } from '@/constants/explore-section/list-views';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { ExploreDataScope } from '@/types/explore-section/application';
import { useExploreTableOnClickHandler } from '@/hooks/virtual-labs';

export default function VirtualLabExperimentListingView() {
  const params = useParams<{ experimentType: string; virtualLabId: string; projectId: string }>();

  const currentExperiment = Object.keys(EXPERIMENT_DATA_TYPES).find(
    (key) => EXPERIMENT_DATA_TYPES[key].name === params?.experimentType
  );

  const virtualLabInfo: VirtualLabInfo = {
    virtualLabId: params.virtualLabId,
    projectId: params.projectId,
  };

  const onCellClick = useExploreTableOnClickHandler();
  if (!currentExperiment) notFound();

  return (
    <ExploreSectionListingView
      dataType={currentExperiment as DataType}
      dataScope={ExploreDataScope.SelectedBrainRegion}
      virtualLabInfo={virtualLabInfo}
      dataKey={params.projectId + currentExperiment}
      onCellClick={onCellClick}
    />
  );
}
