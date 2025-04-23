import { Divider } from 'antd';
import startCase from 'lodash/startCase';

import { MorphoMetricCompartment } from '@/types/explore-section/es-experiment';
import { sourceMorphoMetricsAtom } from '@/state/explore-section/generalization';
import { DetailType } from '@/constants/explore-section/fields-config/types';
import { DataType } from '@/constants/explore-section/list-views';
import { useMorphometrics } from '@/hooks/useMorphoMetrics';
import { useUnwrappedValue } from '@/hooks/hooks';

export default function Morphometrics({
  dataType,
  resource,
}: {
  dataType: DataType;
  resource: DetailType;
}) {
  const metrics = useUnwrappedValue(sourceMorphoMetricsAtom(resource['@id']));
  const { filteredGroupedCardFields, renderMetric } = useMorphometrics(dataType, metrics, true);

  return (
    <div className="flex max-w-(--breakpoint-2xl) flex-col gap-10 pl-2">
      <Divider className="w-full" />
      <h1 className="text-primary-8 text-xl font-bold">Morphometrics</h1>
      <div className="grid grid-cols-5 gap-4 break-words">
        {Object.entries(filteredGroupedCardFields).length &&
          Object.entries(filteredGroupedCardFields).map(([group, fields]) => (
            <div key={group}>
              <h2 className="text-primary-8 mb-8 text-lg font-semibold">{startCase(group)}</h2>
              {fields.map((field) => {
                switch (group) {
                  case MorphoMetricCompartment.NeuronMorphology:
                    return renderMetric(MorphoMetricCompartment.NeuronMorphology, field);
                  case MorphoMetricCompartment.ApicalDendrite:
                    return renderMetric(MorphoMetricCompartment.ApicalDendrite, field);
                  case MorphoMetricCompartment.BasalDendrite:
                    return renderMetric(MorphoMetricCompartment.BasalDendrite, field);
                  case MorphoMetricCompartment.Axon:
                    return renderMetric(MorphoMetricCompartment.Axon, field);
                  case MorphoMetricCompartment.Soma:
                    return renderMetric(MorphoMetricCompartment.Soma, field);
                  default:
                    return null;
                }
              })}
            </div>
          ))}
      </div>
    </div>
  );
}
