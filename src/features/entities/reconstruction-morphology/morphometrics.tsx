import { Divider } from 'antd';
import startCase from 'lodash/startCase';

import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { useMorphometrics } from '@/hooks/useMorphoMetrics';
import { useUnwrappedValue } from '@/hooks/hooks';
import {
  IReconstructionMorphology,
  IReconstructionMorphologyExpanded,
} from '@/api/entitycore/types';
import { MeasurementKind } from '@/api/entitycore/types/entities/measurement-annotation';
import { getMeasurementAnnotations } from '@/api/entitycore/queries/general/measurement-annotation';

const measurementAnnotationsAtomFamily = atomFamily((entityId: string) =>
  atom<Promise<MeasurementKind[]>>(async () => {
    const measurementAnnotationsRes = await getMeasurementAnnotations({
      filters: { entity_id: entityId },
    });

    return measurementAnnotationsRes.data.flatMap((annotation) => annotation.measurement_kinds);
  })
);

export default function Morphometrics({ morphology }: { morphology: IReconstructionMorphology }) {
  const measurementKinds = useUnwrappedValue(measurementAnnotationsAtomFamily(morphology.id));

  const expandedMorphology = {
    ...morphology,
    measurement_annotation: {
      measurement_kinds: measurementKinds,
    },
  } as IReconstructionMorphologyExpanded;

  const { filteredGroupedCardFields, renderMetric } = useMorphometrics(expandedMorphology, true);

  return (
    <div className="flex max-w-(--breakpoint-2xl) flex-col gap-10 pl-2">
      <Divider className="w-full" />
      <h1 className="text-primary-8 text-xl font-bold">Morphometrics</h1>
      <div className="grid grid-cols-5 gap-4 break-words">
        {Object.entries(filteredGroupedCardFields).map(([group, fields]) => (
          <div key={group}>
            <h2 className="text-primary-8 mb-8 text-lg font-semibold">{startCase(group)}</h2>
            {fields.map((field) => renderMetric(field))}
          </div>
        ))}
      </div>
    </div>
  );
}
