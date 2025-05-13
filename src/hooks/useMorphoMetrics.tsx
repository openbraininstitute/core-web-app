import omit from 'lodash/omit';

import { MorphoMetricCompartment } from '@/types/explore-section/es-experiment';
import { getGroupedCardFields } from '@/util/explore-section/cardViewUtils';
import { DataType } from '@/constants/explore-section/list-views';
import { DetailProps } from '@/types/explore-section/application';
import EXPLORE_FIELDS_CONFIG from '@/constants/explore-section/fields-config';
import { DisplayMessages } from '@/constants/display-messages';
import { MeasurementKind } from '@/api/entitycore/types/entities/measurement-annotation';

export const useMorphometrics = (
  dataType: DataType,
  metrics?: MeasurementKind[],
  showLabel?: boolean
) => {
  const groupedCardFields = getGroupedCardFields(dataType);

  const filteredGroupedCardFields = omit(groupedCardFields, 'Metadata');

  const renderMetric = (metricType: MorphoMetricCompartment, field: DetailProps) => {
    if (!metrics) return null;

    const fieldObj = EXPLORE_FIELDS_CONFIG[field.field];
    const metricSource = metrics?.find((metric) => metric.structural_domain === metricType);

    return (
      <div className="text-primary-8 mr-10" key={field.field}>
        {showLabel && <div className="text-neutral-4 uppercase">{fieldObj.title}</div>}
        <div className={`${showLabel ? 'mt-2' : 'mt-0 ml-6'}`}>
          <div className={`mb-2 h-6 truncate ${field.className}`}>
            {metricSource
              ? fieldObj?.render?.esResourceViewFn?.('text', metricSource)
              : DisplayMessages.NO_DATA_STRING}
          </div>
        </div>
      </div>
    );
  };

  return { groupedCardFields, filteredGroupedCardFields, renderMetric };
};
