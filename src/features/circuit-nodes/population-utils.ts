import { NodePopulationType } from '@/api/entitycore/types/entities/circuit';
import { ColumnKindDict, POSITION_COLUMNS } from '@/features/circuit-nodes/types';

import type { ColumnMeta, NodePopulation } from '@/features/circuit-nodes/types';

/**
 * Prefer a biophysical population; otherwise fall back to the first entry.
 *
 * A population with no `type` counts as biophysical, which is what SONATA says
 * it means. Without that a config listing a virtual population first and an
 * untyped biophysical one second would open the virtual one, which has nothing
 * to draw.
 */
export function pickDefaultPopulation(populations: NodePopulation[]): NodePopulation | undefined {
  if (populations.length === 0) return undefined;
  return populations.find(isBiophysical) ?? populations[0];
}

export function isBiophysical(population: Pick<NodePopulation, 'type'>): boolean {
  return (population.type || NodePopulationType.Biophysical) === NodePopulationType.Biophysical;
}

export function resolvePopulation(
  populations: NodePopulation[],
  name: string | undefined
): NodePopulation | undefined {
  if (populations.length === 0) return undefined;
  const current = name ? populations.find((p) => p.name === name) : undefined;
  return current ?? pickDefaultPopulation(populations);
}

export const NO_NAMES: ReadonlySet<string> = new Set();

/**
 * The population's nodes carry no x/y/z, so there is nowhere to draw them.
 *
 * Raised on the main thread rather than by the worker: an error loses its class
 * crossing the worker boundary, and a viewer has to tell this apart from a file
 * that would not open.
 */
export class PopulationWithoutPositionsError extends Error {
  constructor(populationName: string) {
    super(`Population '${populationName}' has no x/y/z columns; nothing to place in 3D`);
    this.name = 'PopulationWithoutPositionsError';
  }
}

/** The worker's `getGeometry` test, answered from a ready session's column list. */
export function hasPositions(columns: readonly ColumnMeta[]): boolean {
  return POSITION_COLUMNS.every((name) =>
    columns.some((column) => column.name === name && column.kind === ColumnKindDict.Numeric)
  );
}
