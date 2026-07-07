import { useEffect, useMemo, useState } from 'react';

import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';

import { buildColorMapping } from './palette';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ColumnKind, NodePopulation } from '@/features/circuit-nodes/types';
import type { ColorMapping } from './types';

function pickDefaultPopulation(populations: NodePopulation[]): NodePopulation | undefined {
  if (populations.length === 0) return undefined;
  return populations.find((p) => p.type === 'biophysical') ?? populations[0];
}

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

/** the raw column fetched for the currently selected property */
interface LoadedColumn {
  property: string;
  kind: ColumnKind;
  values: (string | number)[];
}

/**
 * read the selected node property from the circuit's SONATA H5 (via the shared
 * nodes worker) and turn it into a stable per-node color mapping. when no
 * property is selected, returns `null` (default blue). user `overrides` (value →
 * hex) are folded into the mapping without refetching, so recoloring is instant.
 */
export function useNodeColorMapping(
  circuit: ICircuit | undefined,
  property: string | null,
  overrides?: Record<string, string>,
  background?: string
): Result {
  const { config } = useCircuitConfig(circuit);
  const population = useMemo(
    () => (config ? pickDefaultPopulation(config.nodes) : undefined),
    [config]
  );

  // open the SONATA H5 as soon as the circuit is known (not only after a property
  // is picked) so the dropdown can list the real node columns from source.
  const { getColumn, columns, status, isLoading, error, retry } = useNodesWorker({
    enabled: !!circuit,
    circuitId: circuit?.id ?? '',
    circuitAssetId: config?.circuitAssetId ?? '',
    population,
  });

  const [column, setColumn] = useState<LoadedColumn | null>(null);
  const [buildError, setBuildError] = useState<Error | null>(null);

  useEffect(() => {
    if (!property) {
      setColumn(null);
      setBuildError(null);
      return;
    }
    if (status !== 'ready') return;

    let cancelled = false;
    setBuildError(null);
    // hide the previous key while the new property's column is being read.
    setColumn(null);
    getColumn(property)
      .then(({ kind, values }) => {
        if (cancelled) return;
        setColumn({ property, kind, values });
      })
      .catch((e) => {
        if (cancelled) return;
        setBuildError(e instanceof Error ? e : new Error(String(e)));
        setColumn(null);
      });
    return () => {
      cancelled = true;
    };
  }, [property, status, getColumn]);

  // rebuild the mapping cheaply when overrides or background change (same column,
  // no refetch).
  const mapping = useMemo(() => {
    if (!property || !column || column.property !== property) return null;
    return buildColorMapping({ ...column, overrides, background });
  }, [property, column, overrides, background]);

  return {
    mapping,
    columns,
    loading: !!property && (isLoading || (status === 'ready' && !column && !buildError)),
    error: error ?? buildError,
    status,
    retry,
  };
}
