'use client';

import { notFound, useParams } from 'next/navigation';
import { EXPERIMENT_DATA_TYPES } from '@/constants/explore-section/data-types/experiment-data-types';
import WithExploreExperiment from '@/components/explore-section/WithExploreExperiment';
import { DataType } from '@/constants/explore-section/list-views';
import { ExploreDataScope } from '@/types/explore-section/application';

export default function VirtualLabExperimentListingView() {
  const params = useParams<{ experimentType: string }>();

  const currentExperiment = Object.keys(EXPERIMENT_DATA_TYPES).find(
    (key) => EXPERIMENT_DATA_TYPES[key].name === params?.experimentType
  );
  if (!currentExperiment) notFound();
  return (
    <WithExploreExperiment
      dataType={currentExperiment as DataType}
      dataScope={ExploreDataScope.SelectedBrainRegion}
    />
  );
}
