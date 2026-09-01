import { useEffect, useMemo, useRef, useState } from 'react';

import { nodesWorkerRegistry } from '@/features/circuit-nodes/hooks/nodes-worker-manager';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { nodesOpenParams, nodesSessionKey } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type {
  DownloadProgress,
  NodeGeometry,
  NodePopulation,
} from '@/features/circuit-nodes/types';

type Args = {
  circuit: ICircuit;
  /** The populations to place, in the order they should come back. Memoise it. */
  populations: readonly NodePopulation[];
  /** @see NodeGeometryOptions.withMorphologies */
  withMorphologies?: boolean;
  /** @see NodeGeometryOptions.withOrientations */
  withOrientations?: boolean;
};

export type PlacedPopulation = {
  population: NodePopulation;
  /** Positions, plus whatever else the caller asked for. */
  geometry: NodeGeometry;
};

type Result = {
  /**
   * In `populations` order, minus those that could not be placed. Empty until
   * `settled`, so a viewer builds its scene once, when everything has arrived.
   */
  placed: PlacedPopulation[];
  /** Why a population could not be placed, by name. */
  failures: ReadonlyMap<string, Error>;
  /** Every population has either been placed or given up on. */
  settled: boolean;
  /**
   * The node files still coming, summed: one reading per file, however many
   * populations are read from it, which is what a viewer can say it is waiting
   * for. Null where nothing crossed the wire, meaning every population came
   * from a session another panel already had open, and null again once
   * `settled`.
   */
  download: DownloadProgress | null;
};

/**
 * Reads where the nodes of a circuit's populations sit, one population at a
 * time.
 *
 * Positions by default. A viewer that draws morphologies asks for the
 * `morphology` and `orientation_*` columns too, and pays for them: they are the
 * two parts of a read that scale with the cell count in earnest, which is why
 * the somas-only viewer leaves them alone.
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
export function usePopulationsPlacement({
  circuit,
  populations,
  withMorphologies = false,
  withOrientations = false,
}: Args): Result {
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

  // By node file: how far its download has got. Only the files this effect run
  // opened, and every one of them; see `report`. Keyed by the file and not by
  // the session reading it, so two populations kept in one file describe one
  // download between them instead of counting it twice.
  const [downloads, setDownloads] =
    useState<ReadonlyMap<string, DownloadProgress>>(EMPTY_DOWNLOADS);

  useEffect(() => {
    if (!circuitAssetId) return;

    let cancelled = false;
    // The files of the previous run are read, or are being re-opened here from
    // scratch; either way their byte counts no longer describe the wait. A
    // population joining the list would otherwise inherit them and report a
    // download already complete.
    setDownloads(EMPTY_DOWNLOADS);
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
    // A file that has finished downloading keeps its final reading in the sum:
    // the registry clears `progress` on ready, and subtracting a finished file
    // would take the total backwards while its neighbours are still coming.
    const report = (file: string, progress: DownloadProgress) => {
      if (cancelled) return;
      setDownloads((previous) => new Map(previous).set(file, progress));
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
        if (state.progress) report(population.file, state.progress);
        if (state.status === 'error') {
          // Held open rather than closed: the table and colour-by retry this
          // same session, and the viewer has to pick up that retry too.
          settle(
            population,
            state.error ?? new Error(`Population '${population.name}' could not be opened`)
          );
          // The queue moves on all the same. The outcome is recorded, so this
          // file is no longer busy, and a population waiting behind it would
          // otherwise never be opened at all, leaving the placement unsettled
          // for good, with the viewer on its spinner and the reason unread.
          openReady();
        } else if (state.status === 'loading') {
          forget(population);
        } else if (state.status === 'ready' && !reading) {
          reading = true;
          nodesWorkerRegistry
            .getGeometry(key, { withMorphologies, withOrientations })
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
  }, [circuitId, circuitAssetId, populations, ctx, withMorphologies, withOrientations]);

  // Kept off the memo below so a byte arriving does not hand the caller a new
  // `placed`, which viewers rebuild their scene from.
  const download = useMemo((): DownloadProgress | null => {
    if (downloads.size === 0) return null;
    let received = 0;
    // A file whose response carried no Content-Length has no length to add, and
    // one unknown length makes the sum unknown.
    let total: number | null = 0;
    for (const progress of downloads.values()) {
      received += progress.received;
      if (total !== null) total = progress.total === null ? null : total + progress.total;
    }
    return { received, total };
  }, [downloads]);

  const placement = useMemo(() => {
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

  return useMemo(
    // Nothing is left to wait for once everything is placed, whatever the last
    // reading said.
    () => ({ ...placement, download: placement.settled ? null : download }),
    [placement, download]
  );
}

const EMPTY_OUTCOMES: ReadonlyMap<string, NodeGeometry | Error> = new Map();
const EMPTY_DOWNLOADS: ReadonlyMap<string, DownloadProgress> = new Map();
const EMPTY_FAILURES: ReadonlyMap<string, Error> = new Map();
const UNSETTLED = { placed: [], failures: EMPTY_FAILURES, settled: false };
