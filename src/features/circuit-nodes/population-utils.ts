import type { NodePopulation } from '@/features/circuit-nodes/types';

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
  return (population.type || 'biophysical') === 'biophysical';
}

export function resolvePopulation(
  populations: NodePopulation[],
  name: string | undefined
): NodePopulation | undefined {
  if (populations.length === 0) return undefined;
  const current = name ? populations.find((p) => p.name === name) : undefined;
  return current ?? pickDefaultPopulation(populations);
}
