import { useEffect, useState } from 'react';

import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type {
  NodeGeometry,
  NodePopulation,
  ParsedCircuitConfig,
} from '@/features/circuit-nodes/types';

type Args = {
  circuit: ICircuit;
  /** Which population to place; nothing loads until one is resolved. */
  population: NodePopulation | undefined;
  /** @see NodeGeometryOptions.withMorphologies */
  withMorphologies?: boolean;
  /** @see NodeGeometryOptions.withOrientations */
  withOrientations?: boolean;
};

type Result = {
  geometry: NodeGeometry | null;
  /** The parsed `circuit_config.json`, for callers that need `raw`. */
  config: ParsedCircuitConfig | undefined;
  isLoading: boolean;
  error: Error | null;
};

/**
 * A population's 3D placement, read through the shared nodes worker.
 *
 * The session is keyed by circuit/asset/population inside {@link useNodesWorker},
 * so a viewer and the nodes table looking at the same population download the
 * file once between them.
 */
export function useNodeGeometry({
  circuit,
  population,
  withMorphologies = false,
  withOrientations = false,
}: Args): Result {
  const { config, error: configError } = useCircuitConfig(circuit);

  const {
    getGeometry,
    status,
    error: workerError,
  } = useNodesWorker({
    enabled: !!population,
    circuitId: circuit.id,
    circuitAssetId: config?.circuitAssetId ?? '',
    population,
  });

  const [geometry, setGeometry] = useState<NodeGeometry | null>(null);
  const [geometryError, setGeometryError] = useState<Error | null>(null);

  useEffect(() => {
    if (status !== 'ready') {
      setGeometry(null);
      // Cleared here too, not only once a read succeeds: without it a failed
      // population's error outlives the switch to a working one, and the user
      // reads a stale failure for the length of the next download instead of
      // watching it load.
      setGeometryError(null);
      return;
    }

    let cancelled = false;
    setGeometryError(null);
    getGeometry({ withMorphologies, withOrientations })
      .then((next) => {
        if (!cancelled) setGeometry(next);
      })
      .catch((e) => {
        if (cancelled) return;
        setGeometryError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, [status, getGeometry, withMorphologies, withOrientations]);

  // A config that loads but names no node population would otherwise leave the
  // viewer on its spinner for good: the worker session is gated on having one,
  // so nothing ever fails and nothing ever arrives.
  const noPopulation =
    config && !population
      ? new Error('This circuit\u2019s circuit_config.json declares no node populations')
      : null;

  const error = asError(configError) ?? noPopulation ?? workerError ?? geometryError;

  return { geometry, config, isLoading: !error && !geometry, error };
}

function asError(value: unknown): Error | null {
  if (!value) return null;
  return value instanceof Error ? value : new Error(String(value));
}
