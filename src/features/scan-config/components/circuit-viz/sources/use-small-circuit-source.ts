import { useCallback, useMemo, useState } from 'react';

import { placementAt } from '@/features/circuit-nodes/geometry-utils';
import { useNodeGeometry } from '@/features/circuit-nodes/hooks/use-node-geometry';
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

import { indexOfNodeKey, makeNodeKey, makeVizCellId } from './node-key';
import { morphologyFileOf, resolveMorphologyLocation } from './resolve-morphology-path';
import { useAfferentSynapses } from './use-afferent-synapses';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { NodePlacement } from '@/features/circuit-nodes/geometry-utils';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { TMorphologyRequest } from '@/features/scan-config/components/circuit-viz/sequential-loader';
import type { MorphoViewerSmallCircuitCell } from '@/morpho-viewer';
import type { TSmallCircuitSource } from './types';

/**
 * Soma radius for the placeholder sphere drawn before a cell's morphology
 * arrives. Also seeds the bounding box the camera frames until then, so it
 * wants to be the order of magnitude of the cells on screen.
 */
const PLACEHOLDER_SOMA_RADIUS = 8;

type TOptions = {
  circuit: ICircuit;
  /** Host-owned, so `colorsByNode` is indexed against the cells it colours. */
  population: NodePopulation | undefined;
  showAxons: boolean;
  colorsByNode?: string[];
  /** Paint for nodes colour-by has nothing to say about. */
  defaultColor?: MorphoViewerSmallCircuitCell['color'];
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
 */
export function useSmallCircuitSource({
  circuit,
  population,
  showAxons,
  colorsByNode,
  defaultColor = DEFAULT_NEURON_COLOR,
  withSynapses = false,
}: TOptions): TSmallCircuitSource {
  const { virtualLabId, projectId } = useWorkspace();
  const circuitId = circuit.id;

  // Both, because this source puts a whole morphology in world space: the file
  // to draw comes from the `morphology` column, the rotation that places it from
  // the `orientation_*` ones. The somas-only viewer deliberately asks for
  // neither.
  const { geometry, config, isLoading, error } = useNodeGeometry({
    circuit,
    population,
    withMorphologies: true,
    withOrientations: true,
  });

  const [sonataSectionIds, setSonataSectionIds] =
    useState<Map<string, Map<number, string>>>(EMPTY_SECTION_IDS);

  const cells: MorphoViewerSmallCircuitCell[] = useMemo(() => {
    if (!geometry) return [];

    // Colour-by wins where it has an opinion; failing that a lone cell reads by
    // section type, because telling its dendrites from its axon is the whole
    // point of drawing one. A crowd keeps a flat colour per cell instead, since
    // there the job is telling the cells apart.
    const paint = geometry.count === 1 ? SECTION_TYPE_COLORS : defaultColor;

    const result = new Array<MorphoViewerSmallCircuitCell>(geometry.count);
    for (let i = 0; i < geometry.count; i++) {
      // Non-null: `i` is bounded by the same count `placementAt` checks against.
      const { center, orientation } = placementAt(geometry, i) as NodePlacement;
      result[i] = {
        id: makeVizCellId(makeNodeKey(circuitId, i), showAxons),
        center,
        orientation,
        somaRadius: PLACEHOLDER_SOMA_RADIUS,
        color: colorsByNode?.[i] ?? paint,
      };
    }
    return result;
  }, [geometry, circuitId, showAxons, colorsByNode, defaultColor]);

  // Resolved once per population rather than per cell: every node of a
  // population draws from the same directory or container.
  const location = useMemo(
    () => (config && population ? resolveMorphologyLocation(config.raw, population.name) : null),
    [config, population]
  );

  const morphologies = geometry?.morphologies ?? null;

  /**
   * What OBI-One needs to serve one node's morphology, or null where the node
   * has none to serve — a point-neuron population, or a population whose
   * `circuit_config.json` names no morphology directory at all.
   */
  const morphologyRequest = useCallback(
    (index: number, showAxon: boolean): TMorphologyRequest | null => {
      if (!location) return null;

      const name = morphologies?.[index];
      if (!name) return null;

      return {
        virtualLabId,
        projectId,
        circuitId,
        cellId: makeNodeKey(circuitId, index),
        name,
        file: morphologyFileOf(location, name),
        showAxon,
      };
    },
    [location, morphologies, virtualLabId, projectId, circuitId]
  );

  const loadCell = useCallback(
    async (cellId: string) => {
      const index = indexOfNodeKey(cellId);
      const request = index === null ? null : morphologyRequest(index, showAxons);
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
        const vizCellId = makeVizCellId(cellId, showAxons);
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
    [morphologyRequest, showAxons]
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
    geometry,
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

  return {
    cells,
    loadCell,
    isLoading,
    error,
    retry,
    synapses,
    sonataSectionIds,
  };
}

const EMPTY_SECTION_IDS = new Map<string, Map<number, string>>();
