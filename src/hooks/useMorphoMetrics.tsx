import omit from 'lodash/omit';

import { getGroupedCardFields } from '@/util/explore-section/cardViewUtils';
import { DataType } from '@/constants/explore-section/list-views';
import { DetailProps } from '@/types/explore-section/application';
import EXPLORE_FIELDS_CONFIG from '@/constants/explore-section/fields-config';
import { DisplayMessages } from '@/constants/display-messages';
import { IReconstructionMorphologyExpanded } from '@/api/entitycore/types/entities/reconstruction-morphology';

export const useMorphometrics = (
  morphology: IReconstructionMorphologyExpanded,
  showLabel: boolean = false
) => {
  const groupedCardFields = getGroupedCardFields(DataType.ExperimentalNeuronMorphology);

  const filteredGroupedCardFields = omit(groupedCardFields, 'Metadata');

  const renderMetric = (field: DetailProps) => {
    if (!morphology) return null;

    const fieldObj = EXPLORE_FIELDS_CONFIG[field.field];

    return (
      <div className="text-primary-8 mr-10" key={field.field}>
        {showLabel && <div className="text-neutral-4 uppercase">{fieldObj.title}</div>}
        <div className={`${showLabel ? 'mt-2' : 'mt-0 ml-6'}`}>
          <div className={`mb-2 h-6 truncate ${field.className}`}>
            {morphology ? fieldObj?.render?.(morphology) : DisplayMessages.NO_DATA_STRING}
          </div>
        </div>
      </div>
    );
  };

  return { groupedCardFields, filteredGroupedCardFields, renderMetric };
};
