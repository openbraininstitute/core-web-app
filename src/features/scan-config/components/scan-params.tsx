'use client';

import { useMemo } from 'react';

import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { isFromIdRef, type TFromIdRef } from '@/features/scan-config/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge } from '@/ui/molecules/badge';

/**
 * a `model_identifier_multiple` scan param: one named tuple (e.g. EM synapse
 * mapping neurons) carrying FromID refs, or an array of them for grouped scans.
 */
type TNamedTupleParam = { elements: readonly TFromIdRef[] };

function isNamedTupleParam(value: unknown): value is TNamedTupleParam {
  return isPlainObject(value) && Array.isArray(value.elements) && value.elements.every(isFromIdRef);
}

/** collects the FromID refs from a param value (single tuple or array of tuples). */
function refsFromValue(value: unknown): TFromIdRef[] {
  if (isNamedTupleParam(value)) {
    return [...value.elements];
  }
  if (Array.isArray(value)) {
    return value.filter(isNamedTupleParam).flatMap((tuple) => [...tuple.elements]);
  }
  return [];
}

export function ScanParams({
  scanParams,
  color,
}: {
  scanParams: Record<string, unknown>;
  color: string;
}) {
  const { virtualLabId, projectId } = useWorkspace();

  // flatten every neuron ref across all tuple-valued params into one batched fetch
  const refs = useMemo(() => Object.values(scanParams).flatMap(refsFromValue), [scanParams]);

  const { entities } = useResolvedModelIdentifierEntities({
    refs,
    context: { virtualLabId, projectId },
  });

  const nameById = useMemo(
    () => new Map(entities.map((entity) => [entity.id, entity.name])),
    [entities]
  );

  return (
    <div className="grid w-full min-w-0 grid-cols-2 gap-x-4 gap-y-2">
      {Object.entries(scanParams).map(([key, value]) => {
        const neuronRefs = refsFromValue(value);

        return (
          <div key={key} className="flex min-w-0 w-full flex-col gap-1.5">
            <div title={key} className="w-full text-left min-w-0 wrap-break-word text-gray-400">
              {key.split('.').at(-1)}
            </div>
            {neuronRefs.length > 0 ? (
              <div className="flex w-full min-w-0 flex-wrap gap-1">
                {neuronRefs.map((ref) => (
                  <Badge
                    rounded
                    key={ref.id_str}
                    variant="outline"
                    title={ref.id_str}
                    className="max-w-full font-bold bg-white"
                    style={{ color }}
                  >
                    <span className="truncate select-none">
                      {nameById.get(ref.id_str) ?? ref.id_str}
                    </span>
                  </Badge>
                ))}
              </div>
            ) : (
              <div
                className="truncate font-bold text-ellipsis transition-colors duration-300 text-left"
                style={{ color }}
              >
                {String(value)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
