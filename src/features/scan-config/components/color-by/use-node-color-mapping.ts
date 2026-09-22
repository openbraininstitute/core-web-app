import { useEffect, useMemo, useState } from 'react';

import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { nodesSessionKey, useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';

import { buildColorMapping } from './palette';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ColumnValues, NodePopulation } from '@/features/circuit-nodes/types';
import type { ColorMapping } from './types';

interface Result {
  mapping: ColorMapping | null;
  columns: ReturnType<typeof useNodesWorker>['columns'];
  loading: boolean;
  error: Error | null;
  /** worker session status: "error" means the property list couldn't be read */
  status: ReturnType<typeof useNodesWorker>['status'];
  /** re-open the worker session (retry a failed download/parse) */
  retry: () => void;
}

/** a raw column, as read for one property, in the worker's compact form */
interface LoadedColumn {
  property: string;
  column: ColumnValues;
}

/**
 * read the selected node property from the circuit's SONATA H5 (via the shared
 * nodes worker) and turn it into a stable per-node color mapping. when no
 * property is selected, returns `null` (default blue). user `overrides` (value →
 * hex) are folded into the mapping without refetching, so recoloring is instant.
 */
export function useNodeColorMapping(
  circuit: ICircuit | undefined,
  population: NodePopulation | undefined,
  property: string | null,
  overrides?: Record<string, string>,
  background?: string
): Result {
  const { config } = useCircuitConfig(circuit);

  // open the SONATA H5 as soon as the circuit is known (not only after a property
  // is picked) so the dropdown can list the real node columns from source.
  const { getColumn, columns, status, isLoading, error, retry } = useNodesWorker({
    enabled: !!circuit && !!population,
    circuitId: circuit?.id ?? '',
    circuitAssetId: config?.circuitAssetId ?? '',
    population,
  });

  // The last column read for each population, not only the one on show. When a
  // population comes back on show, by a click on it in 3D, it is painted from
  // here in the render that switches to it, instead of falling back to blue
  // while its session reopens and the column is read again. One column per
  // population, so this holds no more than the remembered choices can ask for.
  // Dropped when the circuit changes, since that is a new scene whether or not
  // the host remounts this hook. Keyed by the session the column was read from.
  const [loaded, setLoaded] = useState<{
    circuitId: string | undefined;
    columns: ReadonlyMap<string, LoadedColumn>;
  }>(() => ({ circuitId: circuit?.id, columns: new Map() }));
  if (loaded.circuitId !== circuit?.id) setLoaded({ circuitId: circuit?.id, columns: new Map() });
  const [buildError, setBuildError] = useState<Error | null>(null);
  const populationKey =
    circuit && population && config
      ? nodesSessionKey(circuit.id, config.circuitAssetId, population.name)
      : undefined;
  const last = populationKey === undefined ? undefined : loaded.columns.get(populationKey);
  const column = last?.property === property ? last : null;

  useEffect(() => {
    setBuildError(null);
    if (!property || populationKey === undefined || column !== null || status !== 'ready') return;

    let cancelled = false;
    getColumn(property)
      .then((column) => {
        if (cancelled) return;
        setLoaded((prev) => ({
          ...prev,
          columns: new Map(prev.columns).set(populationKey, { property, column }),
        }));
      })
      .catch((e) => {
        if (cancelled) return;
        setBuildError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, [property, populationKey, column, status, getColumn]);

  // rebuild the mapping cheaply when overrides or background change (same column,
  // no refetch).
  const mapping = useMemo(
    () => (column ? buildColorMapping({ ...column, overrides, background }) : null),
    [column, overrides, background]
  );

  return {
    mapping,
    columns,
    loading: !!property && !column && (isLoading || (status === 'ready' && !buildError)),
    error: error ?? buildError,
    status,
    retry,
  };
}
