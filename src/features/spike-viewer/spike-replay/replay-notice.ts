import { NodePopulationType } from '@/api/entitycore/types/entities/circuit';

import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

/** The circuit lists the population and backs it with cells to light up. */
export function replayablePopulation(
  nodes: NodePopulation[] | undefined,
  name: string | undefined
): boolean {
  const listed = name === undefined ? undefined : nodes?.find((n) => n.name === name);
  return listed !== undefined && listed.type !== NodePopulationType.Virtual;
}

/** Why what is on show cannot be replayed. */
export function replayNotice(
  recorded: SpikePopulation | undefined,
  name: string | undefined,
  nodes: NodePopulation[] | undefined,
  loading: boolean,
  failed: boolean
): string {
  if (recorded === undefined)
    return 'This simulation recorded no spikes, so there is nothing to replay.';
  if (loading) return 'Reading the circuit’s node populations…';
  if (failed)
    return 'The circuit’s node populations could not be read, so there is nothing to replay these spikes over.';
  if (!nodes?.some((n) => n.name === name))
    return `This circuit has no nodes for “${name}”, so there is nothing to replay these spikes over.`;
  return `“${name}” is an input population — its spikes drive cells rather than fire in them, so there is nothing to light up.`;
}
