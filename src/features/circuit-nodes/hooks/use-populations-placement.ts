import { useEffect, useMemo, useRef, useState } from 'react';

import { nodesWorkerRegistry } from '@/features/circuit-nodes/hooks/nodes-worker-manager';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { nodesOpenParams, nodesSessionKey } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { NodeGeometry, NodePopulation } from '@/features/circuit-nodes/types';

type Args = {
  circuit: ICircuit;
  /** The populations to place, in the order they should come back. Memoise it. */
  populations: readonly NodePopulation[];
};

export type PlacedPopulation = {
  population: NodePopulation;
  /** Positions only: no orientations, no morphology names. */
  geometry: NodeGeometry;
};

type Result = {
  /**
   * In `populations` order, minus those that could not be placed. Empty until
   * `settled`, so a viewer builds its scene once rather than once per arrival.
   */
  placed: PlacedPopulation[];
  /** Why a population could not be placed, by name. */
  failures: ReadonlyMap<string, Error>;
  /** Every population has either been placed or given up on. */
  settled: boolean;
};

/**
 * Reads where the nodes of a circuit's populations sit, positions only, one
 * population at a time.
 *
 * Placements are kept for the lifetime of the hook, so a population that
 * leaves the list and comes back (the one on show, once another is selected)
 * is not read again. A viewer therefore has every position it needs the moment
 * the selection changes, and can repaint the scene instead of rebuilding it.
 *
 * Failures are not kept the same way. The session stays subscribed, so a retry
 * made from the nodes table or the colour-by panel, which share that session,
 * also reaches the viewer.
 *
 * A population whose file will not open, or whose nodes carry no positions
 * (typically an input population), lands in `failures` instead of throwing.
 * Only the caller knows which population's failure is fatal and which is
 * context that can go undrawn.
 *
 * Sessions come from the registry the nodes table and colour-by share, so a
 * population any of them has open is not downloaded again, and each session is
 * released as soon as its positions are read. Two populations stored in one
 * file are opened one after the other: the download URL is stable, so the
 * second read comes from the first's cache rather than fetching a second copy
 * of a very large file.
 */
export function usePopulationsPlacement({ circuit, populations }: Args): Result {
  const ctx = useWorkspace();
  const { config } = useCircuitConfig(circuit);
  const circuitId = circuit.id;
  const circuitAssetId = config?.circuitAssetId;

  // By session key: the geometry, or the error explaining its absence.
  // Mirrored in a ref so the effect below can read the latest value without
  // re-running on every arrival.
  const [outcomes, setOutcomes] =
    useState<ReadonlyMap<string, NodeGeometry | Error>>(EMPTY_OUTCOMES);
  const outcomesRef = useRef(outcomes);

  useEffect(() => {
    if (!circuitAssetId) return;

    let cancelled = false;
    const keyOf = (population: NodePopulation) =>
      nodesSessionKey(circuitId, circuitAssetId, population.name);
    // By name, for the populations whose session is still held: either not
    // yet read, or failed and waiting on a retry.
    const cleanups = new Map<string, () => void>();

    const settle = (population: NodePopulation, outcome: NodeGeometry | Error) => {
      if (cancelled) return;
      const next = new Map(outcomesRef.current).set(keyOf(population), outcome);
      outcomesRef.current = next;
      setOutcomes(next);
    };
    // A failed session is being retried, so drop its recorded outcome.
    const forget = (population: NodePopulation) => {
      if (cancelled || !outcomesRef.current.has(keyOf(population))) return;
      const next = new Map(outcomesRef.current);
      next.delete(keyOf(population));
      outcomesRef.current = next;
      setOutcomes(next);
    };
    // Nothing further is needed from this session, so release it.
    const close = (population: NodePopulation) => {
      if (cancelled) return;
      cleanups.get(population.name)?.();
      cleanups.delete(population.name);
      openReady();
    };

    const open = (population: NodePopulation) => {
      const key = keyOf(population);
      nodesWorkerRegistry.acquire(key, nodesOpenParams(ctx, circuitId, circuitAssetId, population));
      let reading = false;
      const sync = () => {
        const state = nodesWorkerRegistry.getState(key);
        if (state.status === 'error') {
          // Held open rather than closed: the table and colour-by retry this
          // same session, and the viewer has to pick up that retry too.
          settle(
            population,
            state.error ?? new Error(`Population '${population.name}' could not be opened`)
          );
        } else if (state.status === 'loading') {
          forget(population);
        } else if (state.status === 'ready' && !reading) {
          reading = true;
          nodesWorkerRegistry
            .getGeometry(key)
            .then(
              (geometry) => settle(population, geometry),
              (reason: unknown) =>
                settle(population, reason instanceof Error ? reason : new Error(String(reason)))
            )
            .then(() => close(population));
        }
      };
      const unsubscribe = nodesWorkerRegistry.subscribe(key, sync);
      cleanups.set(population.name, () => {
        unsubscribe();
        nodesWorkerRegistry.release(key);
      });
      sync();
    };

    const pending = (population: NodePopulation) =>
      cleanups.has(population.name) && !outcomesRef.current.has(keyOf(population));
    const fileBusy = (file: string) =>
      populations.some((other) => other.file === file && pending(other));
    const placedBefore = (population: NodePopulation) => {
      const outcome = outcomesRef.current.get(keyOf(population));
      return outcome !== undefined && !(outcome instanceof Error);
    };

    // Per effect run. A placement is kept indefinitely; a failure only until
    // `populations` changes, which re-attempts the population.
    const attempted = new Set<string>();
    const openReady = () => {
      for (const population of populations) {
        if (
          attempted.has(population.name) ||
          placedBefore(population) ||
          fileBusy(population.file)
        ) {
          continue;
        }
        attempted.add(population.name);
        open(population);
      }
    };
    openReady();

    return () => {
      cancelled = true;
      for (const cleanup of cleanups.values()) cleanup();
    };
  }, [circuitId, circuitAssetId, populations, ctx]);

  return useMemo(() => {
    if (populations.length === 0) return { placed: [], failures: EMPTY_FAILURES, settled: true };
    if (!circuitAssetId) return UNSETTLED;

    const placed: PlacedPopulation[] = [];
    const failures = new Map<string, Error>();
    for (const population of populations) {
      const outcome = outcomes.get(nodesSessionKey(circuitId, circuitAssetId, population.name));
      if (outcome === undefined) return UNSETTLED;
      if (outcome instanceof Error) failures.set(population.name, outcome);
      else placed.push({ population, geometry: outcome });
    }
    return { placed, failures, settled: true };
  }, [populations, outcomes, circuitId, circuitAssetId]);
}

const EMPTY_OUTCOMES: ReadonlyMap<string, NodeGeometry | Error> = new Map();
const EMPTY_FAILURES: ReadonlyMap<string, Error> = new Map();
const UNSETTLED: Result = { placed: [], failures: EMPTY_FAILURES, settled: false };
