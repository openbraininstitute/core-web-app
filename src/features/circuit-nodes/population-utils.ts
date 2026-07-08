import type { NodePopulation } from '@/features/circuit-nodes/types';

/** prefer biophysical populations; otherwise fall back to the first entry */
export function pickDefaultPopulation(populations: NodePopulation[]): NodePopulation | undefined {
  if (populations.length === 0) return undefined;
  return populations.find((p) => p.type === 'biophysical') ?? populations[0];
}

export function resolvePopulation(
  populations: NodePopulation[],
  name: string | undefined
): NodePopulation | undefined {
  if (populations.length === 0) return undefined;
  const current = name ? populations.find((p) => p.name === name) : undefined;
  return current ?? pickDefaultPopulation(populations);
}
