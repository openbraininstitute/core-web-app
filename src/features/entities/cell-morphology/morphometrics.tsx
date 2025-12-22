import { Divider } from 'antd';
import startCase from 'es-toolkit/compat/startCase';

import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { getMeasurementAnnotations } from '@/api/entitycore/queries/general/measurement-annotation';
import type { ICellMorphology, ICellMorphologyExpanded } from '@/api/entitycore/types';
import type { MeasurementKind } from '@/api/entitycore/types/entities/measurement-annotation';
import { useUnwrappedValue } from '@/hooks/hooks';
import { useMorphometrics } from '@/hooks/useMorphoMetrics';
import { cn } from '@/utils/css-class';

const measurementAnnotationsAtomFamily = atomFamily((entityId: string) =>
  atom<Promise<MeasurementKind[]>>(async () => {
    const measurementAnnotationsRes = await getMeasurementAnnotations({
      filters: { entity_id: entityId },
    });

    return measurementAnnotationsRes.data.flatMap((annotation) => annotation.measurement_kinds);
  })
);

export function Morphometrics({
  morphology,
  className,
}: {
  morphology: ICellMorphology;
  className?: string;
}) {
  const measurementKinds = useUnwrappedValue(measurementAnnotationsAtomFamily(morphology.id));

  const expandedMorphology = {
    ...morphology,
    measurement_annotation: {
      measurement_kinds: measurementKinds,
    },
  } as ICellMorphologyExpanded;

  const { filteredGroupedCardFields, renderMetric } = useMorphometrics(expandedMorphology, true);

  return (
    <div className={cn('flex max-w-(--breakpoint-2xl) flex-col gap-10 pl-2', className)}>
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

export default Morphometrics;
