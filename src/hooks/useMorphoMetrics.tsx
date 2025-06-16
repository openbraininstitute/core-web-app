import groupBy from 'lodash/groupBy';
import omit from 'lodash/omit';

import { IReconstructionMorphologyExpanded } from '@/api/entitycore/types/entities/reconstruction-morphology';
import { DisplayMessages } from '@/constants/display-messages';
import { DataType } from '@/constants/explore-section/list-views';
import { getViewDefinitionByLegacyType } from '@/entity-configuration/definitions/view-defs';
import { DetailProps } from '@/types/explore-section/application';
import FieldsDefinitionRegistry from '@/entity-configuration/definitions';

export const useMorphometrics = (
  morphology: IReconstructionMorphologyExpanded,
  showLabel: boolean = false
) => {
  const groupedCardFields = groupBy(
    getViewDefinitionByLegacyType(DataType.ExperimentalNeuronMorphology)!.cardViewFields,
    (item) => FieldsDefinitionRegistry[item.field]?.group ?? 'Metadata'
  );

  const filteredGroupedCardFields = omit(groupedCardFields, 'Metadata');

  const renderMetric = (field: DetailProps) => {
    if (!morphology) return null;

    const fieldObj = FieldsDefinitionRegistry[field.field];

    return (
      <div className="text-primary-8 mr-10" key={field.field}>
        {showLabel && <div className="text-neutral-4 uppercase">{fieldObj?.title}</div>}
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
