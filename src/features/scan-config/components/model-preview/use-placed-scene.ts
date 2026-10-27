import { useLayoutEffect, useMemo } from 'react';

import { centroidOf } from '@/features/circuit-nodes/geometry-utils';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { usePopulationsPlacement } from '@/features/circuit-nodes/hooks/use-populations-placement';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { NodeGeometry, NodePopulation } from '@/features/circuit-nodes/types';
import type { CircuitSomas } from '@/features/circuit-viewer/morphologies/types';

const NOTHING_HIDDEN: readonly string[] = [];

interface Options {
  circuit: ICircuit;
  /** The population on show. */
  population: NodePopulation | undefined;
  /** Every population to draw, in declared order, including `population`. */
  populations: readonly NodePopulation[];
  /** Populations taken out of the scene, by name. Memoise it: another is read as another setting. */
  hiddenPopulations?: readonly string[];
  /** Colour for the cells of the populations that are not on show. */
  recededColor?: string;
  /** Read each node's morphology and orientation too, to draw its morphology; `orientations` is null without. */
  withMorphologies?: boolean;
  /** Called with the populations whose nodes carry no x/y/z, whenever that set changes. */
  onPositionlessPopulationsChange?: (names: ReadonlySet<string>) => void;
}

/**
 * What both circuit previews build their scene from: every population placed, and the somas of all of them in
 * declared order, with the population on show in its own place, so a cell keeps its number and position whichever is
 * selected and the selection changes colours alone.
 */
export function usePlacedScene({
  circuit,
  population,
  populations,
  hiddenPopulations = NOTHING_HIDDEN,
  recededColor,
  withMorphologies = false,
  onPositionlessPopulationsChange,
}: Options) {
  const { config, error: configError } = useCircuitConfig(circuit);
  // Nothing is reported placed until everything is, so anything placed at all means the whole scene can be built.
  const { placed, failures, positionless, settled, download } = usePopulationsPlacement({
    circuit,
    populations,
    withMorphologies,
    withOrientations: withMorphologies,
  });
  // Before paint, so the checklist and colour-by never show a frame that still counts them.
  useLayoutEffect(() => {
    onPositionlessPopulationsChange?.(positionless);
  }, [positionless, onPositionlessPopulationsChange]);

  const subjectName = population?.name;
  const subject = useMemo(
    (): NodeGeometry | null =>
      placed.find((entry) => entry.population.name === subjectName)?.geometry ?? null,
    [placed, subjectName]
  );
  const anchor = useMemo(() => (subject ? centroidOf(subject) : null), [subject]);
  const hidden = useMemo(() => new Set(hiddenPopulations), [hiddenPopulations]);
  // Context is what is on screen beside the subject, so a hidden population is not it: there is nothing to recede
  // behind the subject and nothing a click could land on.
  const hasContext = placed.some(
    (entry) => entry.population.name !== subjectName && !hidden.has(entry.population.name)
  );

  // A config that loads but names no node population would otherwise leave the viewer on its spinner for good:
  // nothing is asked for, so nothing ever fails.
  const noPopulation =
    config && !population
      ? new Error('This circuit’s circuit_config.json declares no node populations')
      : null;
  // A population that could not be placed is context that goes undrawn, the one on show included: an input population
  // carries no positions, and picking it out of the checklist should not take the circuit off the screen. Only a scene
  // with nothing in it at all is worth covering the canvas for, and then the reason is whichever population failed.
  const noPlacement =
    !settled || placed.length > 0 ? null : (failures.values().next().value ?? null);
  const error = configError ?? noPopulation ?? noPlacement;

  // Built from the placement alone: other somas are another scene to the viewer, which frames it again, so this must
  // not change when the selection does.
  const somas = useMemo((): CircuitSomas => {
    const named = placed.map(({ population: candidate, geometry }) => ({
      name: candidate.name,
      cells: geometry.count,
    }));
    // With a single population, the placement's own array: the hook keeps it alive anyway, so a copy would double
    // region-scale residency.
    if (placed.length === 1) return { positions: placed[0].geometry.positions, populations: named };
    let length = 0;
    for (const { geometry } of placed) length += geometry.positions.length;
    const positions = new Float32Array(length);
    let offset = 0;
    for (const { geometry } of placed) {
      positions.set(geometry.positions, offset);
      offset += geometry.positions.length;
    }
    return { positions, populations: named };
  }, [placed]);

  // Four floats a cell, in the somas' order, the identity where a population carries none.
  const orientations = useMemo(() => {
    if (!withMorphologies) return null;
    const cells = placed.reduce((sum, { geometry }) => sum + geometry.count, 0);
    const all = new Float32Array(4 * cells);
    let first = 0;
    for (const { geometry } of placed) {
      const { count, orientations: turns } = geometry;
      if (turns) all.set(turns.subarray(0, 4 * count), 4 * first);
      else for (let i = 0; i < count; i++) all[4 * (first + i) + 3] = 1;
      first += count;
    }
    return all;
  }, [withMorphologies, placed]);

  // Only where something recedes: this colour follows the background, and a single-population scene should not
  // repaint when the background changes. Hiding the population on show is not the exception it looks like: nothing on
  // screen is the selection then either. The rest recede behind a population on show with no positions too, which the
  // chrome explains; any other failure to place it goes unexplained, and receding everything would grey the circuit out.
  const receded =
    hasContext && (subject || (subjectName !== undefined && positionless.has(subjectName)))
      ? recededColor
      : undefined;

  return {
    config,
    placed,
    settled,
    download,
    subject,
    anchor,
    hidden,
    hasContext,
    error,
    somas,
    orientations,
    receded,
  };
}
