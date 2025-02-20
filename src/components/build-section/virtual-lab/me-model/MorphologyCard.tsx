import { useAtomValue } from 'jotai';
import { useParams } from 'next/navigation';

import {
  selectedMModelAtom,
  selectedMModelOrgAtom,
  selectedMModelProjectAtom,
} from '@/state/virtual-lab/build/me-model';
import { ExperimentTypeNames } from '@/constants/explore-section/data-types/experiment-data-types';
import { detailUrlWithinLab, to64 } from '@/util/common';
import { BookmarkTabsName } from '@/types/virtual-lab/bookmark';
import ModelCard from '@/components/build-section/virtual-lab/me-model/ModelCard';
import { mTypeSelectorFn } from '@/util/explore-section/selector-functions';
import CardVisualization from '@/components/explore-section/CardView/CardVisualization';
import { DataType } from '@/constants/explore-section/list-views';
import { DisplayMessages } from '@/constants/display-messages';

type Props = {
  reselectLink?: boolean;
};

export default function MorphologyCard({ reselectLink = false }: Props) {
  const selectedMModel = useAtomValue(selectedMModelAtom);
  const selectedMModelOrg = useAtomValue(selectedMModelOrgAtom);
  const selectedMModelProject = useAtomValue(selectedMModelProjectAtom);
  const { virtualLabId, projectId } = useParams<{
    virtualLabId?: string;
    projectId?: string;
  }>();

  const generateDetailUrl = () => {
    const orgProj = `${selectedMModelOrg}/${selectedMModelProject}`;

    if (!selectedMModel || !selectedMModelOrg || !selectedMModelProject) return '';
    if (!virtualLabId || !projectId)
      return `/app/explore/interactive/experimental/morphology/${to64(`${orgProj}!/!${selectedMModel['@id']}`)}`;

    return detailUrlWithinLab(
      virtualLabId,
      projectId,
      orgProj,
      selectedMModel['@id'],
      BookmarkTabsName.EXPERIMENTS,
      ExperimentTypeNames.MORPHOLOGY
    );
  };

  const details = [
    { label: 'Brain Region', value: selectedMModel?.brainLocation?.brainRegion?.label },
    { label: 'Species', value: selectedMModel?.subject?.species?.label },
    {
      label: 'License',
      value: selectedMModel?.license?.['@id'] ? (
        <a href={selectedMModel?.license?.['@id']} target="_blank">
          Open 🔗
        </a>
      ) : (
        DisplayMessages.NO_DATA_STRING
      ),
    },
    { label: 'M-Type', value: selectedMModel ? mTypeSelectorFn(selectedMModel) : undefined },
    { label: 'Age', value: undefined },
  ];

  return (
    <ModelCard
      model={selectedMModel}
      modelType="M-Model"
      selectUrl="configure/morphology"
      generateDetailUrl={generateDetailUrl}
      modelDetails={details}
      thumbnail={
        selectedMModel && (
          <CardVisualization
            className="border border-neutral-3"
            dataType={DataType.ExperimentalNeuronMorphology}
            resource={selectedMModel}
            height={200}
            width={200}
          />
        )
      }
      reselectLink={reselectLink}
    />
  );
}
