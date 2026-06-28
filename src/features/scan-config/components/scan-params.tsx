'use client';

import { useMemo } from 'react';

import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { isFromIdRef, type TFromIdRef } from '@/features/scan-config/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge } from '@/ui/molecules/badge';
import { cn } from '@/utils/css-class';

/**
 * a `model_identifier_multiple` scan param: one named tuple (e.g. EM synapse
 * mapping neurons) carrying FromID refs, or an array of them for grouped scans.
 */
type TNamedTupleParam = { elements: readonly TFromIdRef[] };

function isNamedTupleParam(value: unknown): value is TNamedTupleParam {
  return isPlainObject(value) && Array.isArray(value.elements) && value.elements.every(isFromIdRef);
}

/**
 * collects the FromID refs from a scan param value, covering every `model_identifier`
 * shape a grid point can carry:
 * - a single FromID ref (e.g. EM mesh skeletonization: one mesh per grid point)
 * - a named tuple of refs (e.g. EM synapse mapping neuron set)
 * - an array of either (flat multi-select or grouped scans)
 */
function refsFromValue(value: unknown): TFromIdRef[] {
  if (isFromIdRef(value)) {
    return [value];
  }
  if (isNamedTupleParam(value)) {
    return [...value.elements];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (isFromIdRef(entry)) return [entry];
      if (isNamedTupleParam(entry)) return [...entry.elements];
      return [];
    });
  }
  return [];
}

export function ScanParams({
  scanParams,
  configId,
  color,
}: {
  scanParams: Record<string, unknown>;
  color: string;
  configId?: string;
}) {
  const { virtualLabId, projectId } = useWorkspace();

  // flatten every model ref across all model-valued params into one batched fetch
  const refs = useMemo(() => Object.values(scanParams).flatMap(refsFromValue), [scanParams]);

  const { entities } = useResolvedModelIdentifierEntities({
    refs,
    context: { virtualLabId, projectId },
  });

  const nameById = useMemo(
    () => new Map(entities.map((entity) => [entity.id, entity.name])),
    [entities]
  );

  const isSingleParam = Object.keys(scanParams).length === 1;

  return (
    <div
      id="scan-params"
      data-testid="scan-params"
      data-scan-config-selection-card-scan-params-config-id={configId}
      className={cn(
        'grid w-full min-w-0 gap-x-4 gap-y-2',
        isSingleParam ? 'grid-cols-1' : 'grid-cols-2'
      )}
    >
      {Object.entries(scanParams).map(([paramKey, paramValue]) => {
        const refs = refsFromValue(paramValue);

        return (
          <div
            key={paramKey}
            id={`scan-params-item-${paramKey}`}
            data-testid={`scan-params-item-${paramKey}`}
            data-scan-config-selection-card-scan-params-item-param-key={paramKey}
            className="flex min-w-0 w-full flex-col gap-1.5"
          >
            <div
              title={paramKey}
              className="w-full text-left min-w-0 wrap-break-word text-gray-400"
            >
              {paramKey.split('.').at(-1)}
            </div>
            {refs.length > 0 ? (
              <div className="flex w-full min-w-0 flex-wrap gap-1">
                {refs.map((ref) => (
                  <Badge
                    rounded
                    id={ref.id_str}
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
                {String(paramValue)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
