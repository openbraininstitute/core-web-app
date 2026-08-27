import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  centroidOf,
  IDENTITY_QUATERNION,
  placementAt,
  positionAt,
} from '@/features/circuit-nodes/geometry-utils';
import { useNodeGeometry } from '@/features/circuit-nodes/hooks/use-node-geometry';
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
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { TMorphologyRequest } from '@/features/scan-config/components/circuit-viz/sequential-loader';
import type { NodeColors } from '@/features/scan-config/components/color-by/types';
import type { MorphoViewerSmallCircuitCell } from '@/morpho-viewer';
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
  /** Colour for the somas of the populations that are not on show. */
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
 * Only the population on show gets its morphologies. The others in
 * `populations` are drawn as placeholder somas in a receded colour, enough to
 * locate and to click, and load nothing from OBI-One. A hidden population is
 * not even that: it contributes no cells at all.
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

  // Positions for every population, including the one on show. They place the
  // cells and do not change with the selection, so selecting another
  // population repaints the scene instead of re-fitting the camera around it.
  const { placed, settled } = usePopulationsPlacement({ circuit, populations });
  const hidden = useMemo(() => new Set(hiddenPopulations), [hiddenPopulations]);

  // Both, because this source puts a whole morphology in world space: the file
  // to draw comes from the `morphology` column, the rotation that places it from
  // the `orientation_*` ones. The somas-only viewer deliberately asks for
  // neither.
  const {
    geometry: detail,
    config,
    error,
  } = useNodeGeometry({
    circuit,
    population,
    withMorphologies: true,
    withOrientations: true,
  });

  const [sonataSectionIds, setSonataSectionIds] =
    useState<Map<string, Map<number, string>>>(EMPTY_SECTION_IDS);

  const built = useMemo((): MorphoViewerSmallCircuitCell[] | null => {
    // Wait until the population on show can be drawn in full, so the scene
    // does not appear as somas and reload as morphologies a moment later.
    if (!population || !settled || !detail) return null;

    // Colour-by wins where it has an opinion; failing that a lone cell reads by
    // section type, because telling its dendrites from its axon is the whole
    // point of drawing one. A crowd keeps a flat colour per cell instead, since
    // there the job is telling the cells apart.
    const paint = detail.count === 1 ? SECTION_TYPE_COLORS : defaultColor;
    const { palette, columnByNode } = nodeColors ?? EMPTY_NODE_COLORS;

    // In declared order, with the population on show in its own place, so a
    // cell keeps its id and position whichever population is selected. The
    // others are drawn as somas: unrotated, receded, and keyed as such.
    return placed.flatMap(({ population: candidate, geometry: placement }) => {
      // Dropped rather than drawn dark: the viewer asks `loadCell` for every
      // cell it is given, so a population that contributes none is a population
      // whose morphologies are never asked of OBI-One. What stays is a subset of
      // what was on screen, which the viewer reads as the same scene and does
      // not re-frame the camera around.
      if (hidden.has(candidate.name)) return [];
      const onShow = candidate.name === population.name;
      const result = new Array<MorphoViewerSmallCircuitCell>(placement.count);
      for (let i = 0; i < placement.count; i++) {
        result[i] = {
          id: makeVizCellId(makeNodeKey(circuitId, candidate.name, i), {
            showAxons,
            somaOnly: !onShow,
          }),
          center: positionAt(placement, i),
          orientation: onShow
            ? (placementAt(detail, i)?.orientation ?? IDENTITY_QUATERNION)
            : IDENTITY_QUATERNION,
          somaRadius: PLACEHOLDER_SOMA_RADIUS,
          color: onShow ? (palette[columnByNode[i]] ?? paint) : recededColor,
        };
      }
      return result;
    });
  }, [
    population,
    placed,
    hidden,
    settled,
    detail,
    circuitId,
    showAxons,
    nodeColors,
    defaultColor,
    recededColor,
  ]);

  // Keep what is on screen until the next scene can be drawn in full. On a
  // switch, the newly selected population's morphology names and orientations
  // take a moment to arrive, and emptying the scene meanwhile would unmount the
  // viewer, giving a black frame and then a camera reset. This does not apply
  // after a failure: the error panel would sit on the previous population's
  // cells, and a retry would remount the viewer with their ids while `loadCell`
  // answers for the new population.
  const shownRef = useRef<MorphoViewerSmallCircuitCell[]>(NO_CELLS);
  const cells = built ?? (error ? NO_CELLS : shownRef.current);
  useEffect(() => {
    shownRef.current = cells;
  }, [cells]);

  // Resolved once per population rather than per cell: every node of a
  // population draws from the same directory or container.
  const location = useMemo(
    () => (config && population ? resolveMorphologyLocation(config.raw, population.name) : null),
    [config, population]
  );

  const morphologies = detail?.morphologies ?? null;

  /**
   * What OBI-One needs to serve one node's morphology, or null where the node
   * has none to serve — a point-neuron population, or a population whose
   * `circuit_config.json` names no morphology directory at all.
   */
  const morphologyRequest = useCallback(
    (index: number, showAxon: boolean): TMorphologyRequest | null => {
      if (!location || populationName === undefined) return null;

      const name = morphologies?.[index];
      if (!name) return null;

      return {
        virtualLabId,
        projectId,
        circuitId,
        cellId: makeNodeKey(circuitId, populationName, index),
        name,
        file: morphologyFileOf(location, name),
        showAxon,
      };
    },
    [location, morphologies, virtualLabId, projectId, circuitId, populationName]
  );

  const loadCell = useCallback(
    async (cellId: string) => {
      const node = parseNodeKey(cellId);
      // Only the population on show gets its morphologies; the rest stay somas.
      const request =
        node && node.population === populationName
          ? morphologyRequest(node.index, showAxons)
          : null;
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
    [morphologyRequest, showAxons, populationName]
  );

  /** @see useAfferentSynapses — always whole, axons included. */
  const loadTree = useCallback(
    async (index: number) => {
      const request = morphologyRequest(index, true);
      if (!request) return null;

      // Its own queue: the projection must not be dropped by the axon toggle's
      // `clear()`, and it shares the response cache either way.
      const cell = await projectionCellLoader.load(request);
      return cell?.data ?? null;
    },
    [morphologyRequest]
  );

  const synapses = useAfferentSynapses({
    enabled: withSynapses,
    circuit,
    config,
    geometry: detail,
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

  const subject = placed.find((entry) => entry.population.name === populationName)?.geometry;
  const anchor = useMemo(() => (subject ? centroidOf(subject) : null), [subject]);

  return {
    cells,
    loadCell,
    // The viewer's own progress covers the morphologies; this covers the
    // positions of every population, since the scene is built only once they
    // have all arrived.
    isLoading: !error && !settled,
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
