import WithExploreExperiment from '@/components/explore-section/WithExploreExperiment';
import { DataType } from '@/constants/explore-section/list-views';
import { ExploreDataScope } from '@/types/explore-section/application';
import { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';


export default function MorphologyListingPage() {
  return (
    <WithExploreExperiment<IReconstructionMorphology>
      dataType={DataType.ExperimentalNeuronMorphology}
      dataScope={ExploreDataScope.SelectedBrainRegion}
    />
  );
}
