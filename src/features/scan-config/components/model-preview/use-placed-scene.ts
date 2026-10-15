import { useMemo } from 'react';

import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { usePopulationsPlacement } from '@/features/circuit-nodes/hooks/use-populations-placement';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { PlacedPopulation } from '@/features/circuit-nodes/hooks/use-populations-placement';
import type { NodePopulation } from '@/features/circuit-nodes/types';
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
  /** Read each node's morphology and orientation too, to draw its morphology. */
  withMorphologies?: boolean;
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
}: Options) {
  const { config, error: configError } = useCircuitConfig(circuit);
  // Nothing is reported placed until everything is, so anything placed at all means the whole scene can be built.
  const { placed, failures, settled, download } = usePopulationsPlacement({
    circuit,
    populations,
    withMorphologies,
    withOrientations: withMorphologies,
  });

  const subjectName = population?.name;
  const subject = useMemo(
    (): PlacedPopulation | null =>
      placed.find((entry) => entry.population.name === subjectName) ?? null,
    [placed, subjectName]
  );
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

  // Only where something recedes: this colour follows the background, and a single-population scene should not
  // repaint when the background changes. Hiding the population on show is not the exception it looks like: nothing on
  // screen is the selection then either. With the population on show unplaceable there is no selection on screen to
  // recede behind, and receding everything would grey the whole circuit out.
  const receded = hasContext && subject ? recededColor : undefined;

  return { config, placed, settled, download, subject, hidden, hasContext, error, somas, receded };
}
