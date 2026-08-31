import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  centroidOf,
  IDENTITY_QUATERNION,
  placementAt,
  positionAt,
} from '@/features/circuit-nodes/geometry-utils';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { usePopulationsPlacement } from '@/features/circuit-nodes/hooks/use-populations-placement';
import {
  projectionCellLoader,
  SequentialLoaderClearedError,
  sequentialCellLoader,
} from '@/features/scan-config/components/circuit-viz/sequential-loader';
import {
  DEFAULT_NEURON_COLOR,
  SECTION_TYPE_COLORS,
} from '@/features/scan-config/components/color-by/palette';
import useWorkspace from '@/ui/hooks/use-workspace';
import { logError } from '@/utils/logger';

import { makeNodeKey, makeVizCellId, parseNodeKey } from './node-key';
import { morphologyFileOf, resolveMorphologyLocation } from './resolve-morphology-path';
import { useAfferentSynapses } from './use-afferent-synapses';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { PlacedPopulation } from '@/features/circuit-nodes/hooks/use-populations-placement';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { TMorphologyRequest } from '@/features/scan-config/components/circuit-viz/sequential-loader';
import type { NodeColors } from '@/features/scan-config/components/color-by/types';
import type { MorphoViewerSmallCircuitCell } from '@/morpho-viewer';
import type { MorphologyLocation } from './resolve-morphology-path';
import type { TSmallCircuitSource } from './types';

/**
 * Soma radius for the placeholder sphere drawn before a cell's morphology
 * arrives. Also seeds the bounding box the camera frames until then, so it
 * wants to be the order of magnitude of the cells on screen.
 */
export const PLACEHOLDER_SOMA_RADIUS = 8;

type TOptions = {
  circuit: ICircuit;
  /** Host-owned, so `nodeColors` is indexed against the cells it colours. */
  population: NodePopulation | undefined;
  /** @see CircuitVizProps.populations */
  populations: readonly NodePopulation[];
  /** @see CircuitVizProps.hiddenPopulations */
  hiddenPopulations?: readonly string[];
  showAxons: boolean;
  nodeColors?: NodeColors;
  /** Paint for nodes colour-by has nothing to say about. */
  defaultColor?: MorphoViewerSmallCircuitCell['color'];
  /** Colour for the populations that are not on show. */
  recededColor?: string;
  /** Read the circuit's edge files and draw its afferent synapses. */
  withSynapses?: boolean;
};

/**
 * The small-circuit data path: node placement from the circuit's own SONATA
 * file, morphology geometry from OBI-One, and — for circuits small enough to
 * afford it — afferent synapses from the edge files.
 *
 * Placement is a handful of columns in a file the browser already downloads for
 * the nodes table, so reading it again over HTTP was a second copy of bytes in
 * hand. Morphologies are not: they arrive as SWC, ASC or HDF5, and OBI-One runs
 * MorphIO over all three and hands back sections carrying the
 * `sonata_section_id` a click needs to become a morphology location.
 *
 * Every population that names morphologies is drawn with them, whichever one is
 * on show: the one on show is coloured by property and the rest recede, but
 * they all keep their shape. A population that names none — SONATA's `virtual`,
 * an input projection — is drawn as placeholder somas, because that is all
 * there is to draw for it. Drawing only the population on show meant selecting
 * an input emptied the scene of every morphology in it.
 *
 * Affordable because of the scale gate: `circuitDrawsMorphologies` sends
 * anything above a small microcircuit to the somas-only viewer, so the cells
 * summed over every population here are few, and one OBI-One request each is
 * within budget.
 *
 * A hidden population is not drawn at all: it contributes no cells.
 */
export function useSmallCircuitSource({
  circuit,
  population,
  populations,
  hiddenPopulations,
  showAxons,
  nodeColors,
  defaultColor = DEFAULT_NEURON_COLOR,
  recededColor,
  withSynapses = false,
}: TOptions): TSmallCircuitSource {
  const { virtualLabId, projectId } = useWorkspace();
  const circuitId = circuit.id;
  const populationName = population?.name;

  const { config, error: configError } = useCircuitConfig(circuit);

  // Everything the scene is built from, for every population at once: where the
  // cells sit, the morphology each one names, and the rotation that puts that
  // morphology in the world. None of it changes with the selection, so
  // selecting another population repaints the scene instead of re-reading it,
  // and the camera stays where the user left it.
  const { placed, failures, settled, download } = usePopulationsPlacement({
    circuit,
    populations,
    withMorphologies: true,
    withOrientations: true,
  });
  const hidden = useMemo(() => new Set(hiddenPopulations), [hiddenPopulations]);

  const [sonataSectionIds, setSonataSectionIds] =
    useState<Map<string, Map<number, string>>>(EMPTY_SECTION_IDS);

  /** The population on show, which is what the synapses and the anchor are for. */
  const subject = useMemo(
    () => placed.find((entry) => entry.population.name === populationName) ?? null,
    [placed, populationName]
  );

  // Resolved once per population rather than per cell: every node of a
  // population draws from the same directory or container.
  const locations = useMemo(() => {
    const byPopulation = new Map<string, MorphologyLocation | null>();
    if (!config) return byPopulation;
    for (const { population: candidate } of placed) {
      byPopulation.set(candidate.name, resolveMorphologyLocation(config.raw, candidate.name));
    }
    return byPopulation;
  }, [config, placed]);

  /**
   * What OBI-One needs to serve one node's morphology, or null where the node
   * has none to serve — an input or point-neuron population, or a population whose
   * `circuit_config.json` names no morphology directory at all.
   *
   * Asked twice, and the two answers have to agree: the scene marks a node with nothing to
   * serve so the viewer neither requests a morphology for it nor counts it among the ones it
   * is waiting on, and `loadCell` returns nothing when asked for one. Were those to disagree
   * the viewer would wait on a morphology that is never coming.
   */
  const morphologyRequest = useCallback(
    (
      { population: candidate, geometry }: PlacedPopulation,
      index: number,
      showAxon: boolean
    ): TMorphologyRequest | null => {
      const location = locations.get(candidate.name);
      if (!location) return null;

      const name = geometry.morphologies?.[index];
      if (!name) return null;

      return {
        virtualLabId,
        projectId,
        circuitId,
        cellId: makeNodeKey(circuitId, candidate.name, index),
        name,
        file: morphologyFileOf(location, name),
        showAxon,
      };
    },
    [locations, virtualLabId, projectId, circuitId]
  );

  const built = useMemo((): MorphoViewerSmallCircuitCell[] | null => {
    // Wait until every population has been read, so the scene is built once
    // rather than once per arrival: the viewer re-fits the camera whenever the
    // set of ids changes.
    if (!population || !settled) return null;

    // Colour-by wins where it has an opinion; failing that a lone cell reads by
    // section type, because telling its dendrites from its axon is the whole
    // point of drawing one. A crowd keeps a flat colour per cell instead, since
    // there the job is telling the cells apart.
    const paint = subject?.geometry.count === 1 ? SECTION_TYPE_COLORS : defaultColor;
    const { palette, columnByNode } = nodeColors ?? EMPTY_NODE_COLORS;

    // In declared order, with the population on show in its own place, so a
    // cell keeps its id, its position and its morphology whichever population
    // is selected. Colour is all the selection changes.
    return placed.flatMap((entry) => {
      const { population: candidate, geometry } = entry;
      // Dropped rather than drawn dark: a hidden population contributes no
      // cells, so nothing is drawn for it and nothing is asked of OBI-One for
      // it either. What stays is a subset of what was on screen, which the
      // viewer reads as the same scene and does not re-frame the camera around.
      if (hidden.has(candidate.name)) return [];
      const onShow = candidate.name === population.name;
      const result = new Array<MorphoViewerSmallCircuitCell>(geometry.count);
      for (let i = 0; i < geometry.count; i++) {
        result[i] = {
          id: makeVizCellId(makeNodeKey(circuitId, candidate.name, i), { showAxons }),
          center: positionAt(geometry, i),
          orientation: placementAt(geometry, i)?.orientation ?? IDENTITY_QUATERNION,
          somaRadius: PLACEHOLDER_SOMA_RADIUS,
          color: onShow ? (palette[columnByNode[i]] ?? paint) : recededColor,
          // Told to the viewer, not left for it to discover by asking: it counts the cells it
          // is waiting on, and a scene where most of them will never answer would otherwise
          // report itself nearly loaded before the first morphology arrived.
          somaOnly: morphologyRequest(entry, i, showAxons) === null,
        };
      }
      return result;
    });
  }, [
    population,
    placed,
    hidden,
    settled,
    subject,
    circuitId,
    showAxons,
    morphologyRequest,
    nodeColors,
    defaultColor,
    recededColor,
  ]);

  // A config that loads but names no node population would otherwise leave the
  // viewer on its spinner for good: nothing is asked for, so nothing ever fails
  // and nothing ever arrives.
  const noPopulation =
    config && !population
      ? new Error('This circuit’s circuit_config.json declares no node populations')
      : null;
  // A population that could not be placed is context that goes undrawn: an
  // input population carrying no positions is the ordinary case, and the scene
  // stands without it. Only a scene with nothing in it at all is worth covering
  // the canvas for, and then the reason is whichever population failed.
  const noPlacement =
    !settled || placed.length > 0 ? null : (failures.values().next().value ?? null);
  const error = configError ?? noPopulation ?? noPlacement;

  // Keep what is on screen until the next scene can be drawn. A population
  // joining or leaving the list takes a moment to read, and emptying the scene
  // meanwhile would unmount the viewer, giving a black frame and then a camera
  // reset. This does not apply after a failure: the error panel would sit on
  // cells that 'Try again' is about to replace.
  const shownRef = useRef<MorphoViewerSmallCircuitCell[]>(NO_CELLS);
  const cells = built ?? (error ? NO_CELLS : shownRef.current);
  useEffect(() => {
    shownRef.current = cells;
  }, [cells]);

  const loadCell = useCallback(
    async (cellId: string) => {
      const node = parseNodeKey(cellId);
      if (!node) return null;

      // Answered for every population drawn, not only the one on show: they all
      // keep their morphologies, and only their colour changes.
      const entry = placed.find((candidate) => candidate.population.name === node.population);
      const request = entry ? morphologyRequest(entry, node.index, showAxons) : null;
      if (!request) return null;

      try {
        // Queued: morphoviewer asks for every cell at once, and one request per
        // cell in flight is what OBI-One is least able to absorb.
        const loaded = await sequentialCellLoader.load(request);
        // Keyed by the id the viewer addresses the cell by, not the one it asked
        // with: morphoviewer strips the query part before calling `loadCell`,
        // while `useMorphologyLocationSelection` looks this map up by `cell.id`.
        // The axon flag belongs in the key either way — the index is built from
        // the filtered sections, so it names different sections with axons off.
        const vizCellId = makeVizCellId(cellId, { showAxons });
        // Guarded so a repeated load of the same cell does not re-render.
        setSonataSectionIds((previous) =>
          previous.get(vizCellId) === loaded.sonataSectionIds
            ? previous
            : new Map(previous).set(vizCellId, loaded.sonataSectionIds)
        );
        return loaded;
      } catch (e) {
        // Cancellations are the axon toggle clearing the queue, and those cells
        // are about to be re-requested anyway.
        if (e instanceof SequentialLoaderClearedError) return null;
        // A failed cell is drawn as its placeholder soma rather than taking the
        // viewer down — and that means not raising it either: `error` renders as
        // a full-canvas panel, so one unreachable morphology would hide a circuit
        // that otherwise drew fine. The soma standing where the cell should be is
        // the signal; the console carries the reason.
        logError(`Unable to load cell "${cellId}":`, e);
        return null;
      }
    },
    [placed, morphologyRequest, showAxons]
  );

  /**
   * @see useAfferentSynapses — always whole, axons included.
   *
   * Indices are the population on show's own, which is what the edge files
   * address: synapses are drawn for a single-cell circuit, where that
   * population is the only one with anything to target.
   */
  const loadTree = useCallback(
    async (index: number) => {
      const request = subject ? morphologyRequest(subject, index, true) : null;
      if (!request) return null;

      // Its own queue: the projection must not be dropped by the axon toggle's
      // `clear()`, and it shares the response cache either way.
      const cell = await projectionCellLoader.load(request);
      return cell?.data ?? null;
    },
    [morphologyRequest, subject]
  );

  const synapses = useAfferentSynapses({
    enabled: withSynapses,
    circuit,
    config,
    geometry: subject?.geometry ?? null,
    loadTree,
  });

  const retry = useCallback(() => {
    setSonataSectionIds(EMPTY_SECTION_IDS);
    // Both queues: a synapse projection runs on its own so the axon toggle
    // cannot drop it, which also means the cell queue's `clear()` does not reach
    // it and a failed projection would never be redone.
    sequentialCellLoader.clear();
    projectionCellLoader.clear();
  }, []);

  const anchor = useMemo(() => (subject ? centroidOf(subject.geometry) : null), [subject]);

  return {
    cells,
    loadCell,
    // Nothing on screen yet. The viewer's own progress covers the morphologies;
    // this covers everything before them — the placement of every population,
    // since the scene is built only once it has all arrived. An empty scene is
    // not always this: hiding every population empties it on purpose, and then
    // there is nothing left to wait for.
    isLoading: !error && built === null && cells.length === 0,
    download,
    error,
    retry,
    synapses,
    sonataSectionIds,
    anchor,
  };
}

const EMPTY_SECTION_IDS = new Map<string, Map<number, string>>();
const NO_CELLS: MorphoViewerSmallCircuitCell[] = [];
const EMPTY_NODE_COLORS: NodeColors = { palette: [], columnByNode: new Uint16Array(0) };
