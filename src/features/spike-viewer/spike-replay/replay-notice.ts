import { NodePopulationType } from '@/api/entitycore/types/entities/circuit';

import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

/** Why the 3D view has nothing to show for the population chosen. */
export type RasterOnlyReason = 'nodes-error' | 'no-positions' | 'per-cell-input';

export type Notice = { text: string; warning: boolean };

/** The circuit lists the population as cells of its own rather than as an input. */
export function listedCellPopulation(
  nodes: NodePopulation[] | undefined,
  name: string | undefined
): boolean {
  const listed = name === undefined ? undefined : nodes?.find((n) => n.name === name);
  return listed !== undefined && listed.type !== NodePopulationType.Virtual;
}

export function rasterOnlyReason(
  listed: NodePopulation | undefined,
  nodesFailed: boolean,
  positioned: boolean | undefined,
  drawsEachCell: boolean
): RasterOnlyReason | undefined {
  if (listed === undefined) return undefined;
  if (positioned === false) return 'no-positions';
  if (listed.type !== NodePopulationType.Virtual) return undefined;
  // The scene's error panel would be about an input it may never have drawn.
  if (nodesFailed) return 'nodes-error';
  if (drawsEachCell) return 'per-cell-input';
  return undefined;
}

export function rasterOnlyNote(reason: RasterOnlyReason, name: string | undefined): Notice {
  if (reason === 'nodes-error')
    return {
      text: `The nodes of “${name}” could not be read, so its spikes can’t be shown in 3D.`,
      warning: true,
    };
  if (reason === 'per-cell-input')
    return {
      text: '3D replay of input populations isn’t available for small circuits yet.',
      warning: false,
    };
  return {
    text: `“${name}” has no positions (x/y/z), so its spikes can’t be shown in 3D.`,
    warning: false,
  };
}

/** Why what is on show cannot be replayed. */
export function replayNotice(
  recorded: SpikePopulation | undefined,
  name: string | undefined,
  loading: boolean,
  failed: boolean
): string {
  if (recorded === undefined)
    return 'This simulation recorded no spikes, so there is nothing to replay.';
  if (loading) return 'Reading the circuit’s node populations…';
  if (failed)
    return 'The circuit’s node populations could not be read, so there is nothing to replay these spikes over.';
  return `This circuit has no nodes for “${name}”, so there is nothing to replay these spikes over.`;
}
