import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { circuitMorphologyPath } from '@/api/one/circuit-visualization';
import {
  cellColorsOf,
  pointingOut,
  populationRanges,
} from '@/features/circuit-viewer/morphologies/cell-colors';
import { loadSections } from '@/features/circuit-viewer/morphologies/load/read-sections';
import { treeOf } from '@/features/circuit-viewer/morphologies/load/tree';
import { SECTION_TYPE_COLORS } from '@/features/scan-config/components/color-by/palette';
import { usePlacedScene } from '@/features/scan-config/components/model-preview/use-placed-scene';
import useWorkspace from '@/ui/hooks/use-workspace';

import { morphologyFileOf, resolveMorphologyLocation } from './resolve-morphology-path';
import { useAfferentSynapses } from './use-afferent-synapses';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { PlacedPopulation } from '@/features/circuit-nodes/hooks/use-populations-placement';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { SectionsRequest } from '@/features/circuit-viewer/morphologies/load/read-sections';
import type { TreeSource } from '@/features/circuit-viewer/morphologies/use-tree-morphologies';
import type { NodeColors } from '@/features/scan-config/components/color-by/types';
import type { MorphologyLocation } from './resolve-morphology-path';
import type { TSmallCircuitSource } from './types';

const NOTHING_HIDDEN: readonly string[] = [];

type TOptions = {
  circuit: ICircuit;
  /** Host-owned, so `nodeColors` is indexed against the cells it colours. */
  population: NodePopulation | undefined;
  /** Every population to draw, in declared order, including `population`. */
  populations: readonly NodePopulation[];
  /** Populations taken out of the scene, by name. Memoise it: another is read as another setting. */
  hiddenPopulations?: readonly string[];
  /** @see CircuitVizProps.shownCells */
  shownCells?: Uint8Array;
  /** @see CircuitVizProps.highlightedCell */
  highlightedCell?: number;
  /** @see CircuitVizProps.onPositionlessPopulationsChange */
  onPositionlessPopulationsChange?: (names: ReadonlySet<string>) => void;
  nodeColors?: NodeColors;
  /** Colour for the populations that are not on show. */
  recededColor?: string;
  /** Read the circuit's edge files and draw its afferent synapses. */
  withSynapses?: boolean;
};

/**
 * The small-circuit data path: node placement from the circuit's own SONATA file, morphology geometry from OBI-One,
 * and, for circuits small enough to afford it, afferent synapses from the edge files.
 *
 * Placement is a handful of columns in a file the browser already downloads for the nodes table. Morphologies arrive
 * as SWC, ASC or HDF5, and OBI-One runs MorphIO over all three and hands back sections carrying the
 * `sonata_section_id` a click needs to become a morphology location.
 *
 * Every population is in the scene, in declared order, whichever is on show, so a cell keeps its number, its position
 * and its morphology whatever is selected or hidden: the selection changes colours alone, and hiding a population
 * draws its cells not at all and reads none of their morphologies.
 *
 * A virtual population is drawn as somas even where it names morphologies, which some do. It is an input projection,
 * with no biophysics of its own to show, and it is routinely hundreds of thousands of nodes in a circuit whose
 * biophysical population is a handful. The scale gate does not catch that: `circuitDrawsEachCell` measures the
 * circuit rather than the population.
 */
export function useSmallCircuitSource({
  circuit,
  population,
  populations,
  hiddenPopulations = NOTHING_HIDDEN,
  shownCells,
  highlightedCell,
  onPositionlessPopulationsChange,
  nodeColors,
  recededColor,
  withSynapses = false,
}: TOptions): TSmallCircuitSource {
  const { virtualLabId, projectId } = useWorkspace();
  const queryClient = useQueryClient();
  const circuitId = circuit.id;
  const populationName = population?.name;
  const hasPopulation = population !== undefined;

  // Everything the scene is built from, for every population at once: where the cells sit, the morphology each one
  // names, and the rotation that puts that morphology in the world.
  const {
    config,
    placed,
    settled,
    download,
    subject,
    anchor,
    hidden,
    error,
    somas,
    orientations,
    receded,
  } = usePlacedScene({
    circuit,
    population,
    populations,
    hiddenPopulations,
    recededColor,
    withMorphologies: true,
    onPositionlessPopulationsChange,
  });

  // Resolved once per population rather than per cell: every node of a population draws from the same directory or
  // container.
  const locations = useMemo(() => {
    const byPopulation = new Map<string, MorphologyLocation | null>();
    if (!config) return byPopulation;
    for (const { population: candidate } of placed) {
      byPopulation.set(candidate.name, resolveMorphologyLocation(config.raw, candidate.name));
    }
    return byPopulation;
  }, [config, placed]);

  /**
   * Where one node's morphology is read, or null where the node has none to serve: an input or point-neuron
   * population, or one whose `circuit_config.json` names no morphology directory at all.
   */
  const sectionsRequest = useCallback(
    ({ population: candidate, geometry }: PlacedPopulation, index: number) => {
      const location = locations.get(candidate.name);
      const name = geometry.morphologies?.[index];
      if (!location || !name) return null;
      return {
        path: circuitMorphologyPath(circuitId, morphologyFileOf(location, name), name),
        virtualLabId,
        projectId,
      };
    },
    [locations, circuitId, virtualLabId, projectId]
  );

  // Built once every population has been read, from the placement alone: another is another scene to the viewer, which
  // reads every morphology again and frames it anew, so it must not change with the selection.
  const built = useMemo((): TreeSource | null => {
    if (!hasPopulation || !settled || placed.length === 0) return null;
    const requests: (SectionsRequest | null)[] = [];
    for (const entry of placed) {
      for (let i = 0; i < entry.geometry.count; i++) requests.push(sectionsRequest(entry, i));
    }
    return { somas, orientations, requests };
  }, [hasPopulation, settled, placed, somas, orientations, sectionsRequest]);

  // Keep what is on screen until the next scene can be drawn: a population joining or leaving the list takes a moment
  // to read. Not after a failure, which the error panel covers.
  // State rather than a ref: React Compiler will not read a ref in render.
  const [shown, setShown] = useState<TreeSource | null>(null);
  const tree = built ?? (error ? null : shown);
  if (tree !== shown) setShown(tree);

  // Sliced to the population on show: matched against another's morphologies, a location would mark every cell whose
  // sections number the same way. None while it is hidden, whose cells are not drawn.
  const locationCells = useMemo(() => {
    const range = tree
      ? populationRanges(tree.somas.populations).find(({ name }) => name === populationName)
      : undefined;
    if (!tree || !range || hidden.has(range.name)) return [];
    return Array.from({ length: range.end - range.first }, (_, i) => range.first + i).filter(
      (cell) => tree.requests[cell] !== null
    );
  }, [tree, populationName, hidden]);

  const pointed = pointingOut(highlightedCell, locationCells.length > 0, recededColor);
  const cellColors = useMemo(
    () =>
      cellColorsOf({
        populations: tree?.somas.populations ?? [],
        subject: populationName,
        nodeColors,
        // Colour-by wins where it has an opinion; failing that a lone cell reads by section type, because telling its
        // dendrites from its axon is the whole point of drawing one. A crowd keeps a flat colour per cell instead.
        own: subject?.count === 1 ? SECTION_TYPE_COLORS : null,
        receded,
        hidden,
        shownCells,
        highlightedCell,
        fadedColor: pointed.fadedColor,
      }),
    [
      tree,
      populationName,
      nodeColors,
      subject,
      receded,
      hidden,
      shownCells,
      highlightedCell,
      pointed.fadedColor,
    ]
  );

  /** Population the afferent synapses target: the first one with morphologies, whatever is on show. */
  const synapseTarget = useMemo(
    () => placed.find((entry) => locations.get(entry.population.name) != null) ?? null,
    [placed, locations]
  );

  // Always whole, axons included. Indices are the target population's own, which is what the edge files address.
  const loadTree = useCallback(
    async (index: number) => {
      const request = synapseTarget && sectionsRequest(synapseTarget, index);
      return request ? treeOf(await loadSections(queryClient, request), { axons: true }) : null;
    },
    [queryClient, sectionsRequest, synapseTarget]
  );

  const synapses = useAfferentSynapses({
    enabled: withSynapses,
    circuit,
    config,
    placementSettled: settled,
    geometry: synapseTarget?.geometry ?? null,
    loadTree,
  });

  return {
    tree,
    cellColors,
    hidden: hiddenPopulations,
    locationCells,
    download,
    error,
    synapses,
    anchor,
    hover: pointed.hover,
  };
}
