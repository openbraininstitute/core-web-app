'use client';

import { useQuery } from '@tanstack/react-query';
import { Divider } from 'antd';
import { startCase } from 'es-toolkit/compat';

import { getMeasurementAnnotations } from '@/api/entitycore/queries/general/measurement-annotation';
import { useMorphometrics } from '@/hooks/useMorphoMetrics';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

import type { ICellMorphology, ICellMorphologyExpanded } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

function MorphometricsSkeleton() {
  return (
    <div className="grid grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, groupIdx) => (
        <div
          key={`skeleton-group-${
            // biome-ignore lint/suspicious/noArrayIndexKey: just skeleton
            groupIdx
          }`}
        >
          <Skeleton className="mb-6 h-6 w-3/5 rounded-full" />
          {Array.from({ length: 4 }).map((__, fieldIdx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: just skeleton
            <div className="mr-10 mb-4" key={`skeleton-field-${groupIdx}-${fieldIdx}`}>
              <Skeleton className="mb-2 h-2 w-1/2 rounded-full" />
              <Skeleton className="mt-2 h-4 w-2/3 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Morphometrics({
  morphology,
  context,
  className,
}: {
  morphology: ICellMorphology;
  className?: string;
  context: WorkspaceContext;
}) {
  const { data: measurementKinds, isLoading } = useQuery({
    queryKey: ['measurement-annotations', morphology.id],
    queryFn: async () => {
      return await getMeasurementAnnotations({
        filters: { entity_id: morphology.id },
        context,
      });
    },
    select: (measurementAnnotationsRes) => {
      return measurementAnnotationsRes.data.flatMap((annotation) => annotation.measurement_kinds);
    },
  });

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
      {isLoading ? (
        <MorphometricsSkeleton />
      ) : (
        <div className="grid grid-cols-5 gap-4 wrap-break-word">
          {Object.entries(filteredGroupedCardFields).map(([group, fields]) => (
            <div key={group}>
              <h2 className="text-primary-8 mb-8 text-lg font-semibold">{startCase(group)}</h2>
              {fields.map((field) => renderMetric(field))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Morphometrics;
