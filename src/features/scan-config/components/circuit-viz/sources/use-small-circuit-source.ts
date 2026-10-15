import { useCallback, useMemo, useState } from 'react';

import { circuitMorphologyPath } from '@/api/one/circuit-visualization';
import { centroidOf } from '@/features/circuit-nodes/geometry-utils';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { usePopulationsPlacement } from '@/features/circuit-nodes/hooks/use-populations-placement';
import { cellColorsOf, populationRanges } from '@/features/circuit-viewer/morphologies/cell-colors';
import { loadSections } from '@/features/circuit-viewer/morphologies/load/read-sections';
import { treeOf } from '@/features/circuit-viewer/morphologies/load/tree';
import { SECTION_TYPE_COLORS } from '@/features/scan-config/components/color-by/palette';
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
 * biophysical population is a handful. The scale gate does not catch that: `circuitDrawsMorphologies` measures the
 * circuit rather than the population.
 */
export function useSmallCircuitSource({
  circuit,
  population,
  populations,
  hiddenPopulations = NOTHING_HIDDEN,
  nodeColors,
  recededColor,
  withSynapses = false,
}: TOptions): TSmallCircuitSource {
  const { virtualLabId, projectId } = useWorkspace();
  const circuitId = circuit.id;
  const populationName = population?.name;
  const hasPopulation = population !== undefined;

  const { config, error: configError } = useCircuitConfig(circuit);

  // Everything the scene is built from, for every population at once: where the cells sit, the morphology each one
  // names, and the rotation that puts that morphology in the world.
  const { placed, failures, settled, download } = usePopulationsPlacement({
    circuit,
    populations,
    withMorphologies: true,
    withOrientations: true,
  });

  const subject = useMemo(
    () => placed.find((entry) => entry.population.name === populationName) ?? null,
    [placed, populationName]
  );

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
    let cells = 0;
    for (const { geometry } of placed) cells += geometry.count;
    const positions = new Float32Array(3 * cells);
    const orientations = new Float32Array(4 * cells);
    const requests: (SectionsRequest | null)[] = [];
    let first = 0;
    for (const entry of placed) {
      const { count, positions: at, orientations: turns } = entry.geometry;
      positions.set(at.subarray(0, 3 * count), 3 * first);
      if (turns) orientations.set(turns.subarray(0, 4 * count), 4 * first);
      else for (let i = 0; i < count; i++) orientations[4 * (first + i) + 3] = 1;
      for (let i = 0; i < count; i++) requests.push(sectionsRequest(entry, i));
      first += count;
    }
    return {
      somas: {
        positions,
        populations: placed.map((entry) => ({
          name: entry.population.name,
          cells: entry.geometry.count,
        })),
      },
      orientations,
      requests,
    };
  }, [hasPopulation, settled, placed, sectionsRequest]);

  // A config that loads but names no node population would otherwise leave the viewer on its spinner for good.
  const noPopulation =
    config && !population
      ? new Error('This circuit’s circuit_config.json declares no node populations')
      : null;
  // A population that could not be placed is context that goes undrawn: an input population carrying no positions is
  // the ordinary case, and the scene stands without it. Only a scene with nothing in it at all is worth covering the
  // canvas for, and then the reason is whichever population failed.
  const noPlacement =
    !settled || placed.length > 0 ? null : (failures.values().next().value ?? null);
  const error = configError ?? noPopulation ?? noPlacement;

  // Keep what is on screen until the next scene can be drawn: a population joining or leaving the list takes a moment
  // to read. Not after a failure, which the error panel covers.
  // State rather than a ref: React Compiler will not read a ref in render.
  const [shown, setShown] = useState<TreeSource | null>(null);
  const tree = built ?? (error ? null : shown);
  if (tree !== shown) setShown(tree);

  const hidden = useMemo(() => new Set(hiddenPopulations), [hiddenPopulations]);
  const cellColors = useMemo(
    () =>
      cellColorsOf({
        populations: tree?.somas.populations ?? [],
        subject: populationName,
        nodeColors,
        // Colour-by wins where it has an opinion; failing that a lone cell reads by section type, because telling its
        // dendrites from its axon is the whole point of drawing one. A crowd keeps a flat colour per cell instead.
        own: subject?.geometry.count === 1 ? SECTION_TYPE_COLORS : null,
        // The rest recede behind the population on show, unless that one could not be placed: there is then nothing on
        // screen to recede behind.
        receded: subject ? recededColor : undefined,
        hidden,
      }),
    [tree, populationName, nodeColors, subject, recededColor, hidden]
  );

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

  /** Population the afferent synapses target: the first one with morphologies, whatever is on show. */
  const synapseTarget = useMemo(
    () => placed.find((entry) => locations.get(entry.population.name) != null) ?? null,
    [placed, locations]
  );

  // Always whole, axons included. Indices are the target population's own, which is what the edge files address.
  const loadTree = useCallback(
    async (index: number) => {
      const request = synapseTarget && sectionsRequest(synapseTarget, index);
      return request ? treeOf(await loadSections(request), { axons: true }) : null;
    },
    [sectionsRequest, synapseTarget]
  );

  const synapses = useAfferentSynapses({
    enabled: withSynapses,
    circuit,
    config,
    placementSettled: settled,
    geometry: synapseTarget?.geometry ?? null,
    loadTree,
  });

  const anchor = useMemo(() => (subject ? centroidOf(subject.geometry) : null), [subject]);

  return {
    tree,
    cellColors,
    hidden: hiddenPopulations,
    locationCells,
    download,
    error,
    synapses,
    anchor,
  };
}
