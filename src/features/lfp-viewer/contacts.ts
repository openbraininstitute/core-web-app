import type { TElectrodeLocationsDictionarySummary } from '@/api/one/generated/extracellular-locations-block-dictionary-summary';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The recording array a report was made with: obi-one names its electrodes file by the array's id. */
export function recordingArrayId(electrodesFile: unknown): string | null {
  if (typeof electrodesFile !== 'string') return null;
  const stem = (electrodesFile.split('/').at(-1) ?? '').replace(/\.h5$/i, '');
  return UUID.test(stem) ? stem : null;
}

export type ContactBlock = { name: string; first: number; count: number };

/**
 * Each contact's position in the report's order: the array's blocks in the order
 * they are stored, each block's contacts in turn. Null when that order gives a
 * different number of contacts than the report has, as when a block's name is a
 * number, which JavaScript lists before the others.
 */
export function contactPositions(
  locations: TElectrodeLocationsDictionarySummary,
  contacts: number
): { positions: Float32Array; blocks: ContactBlock[] } | null {
  const blocks: ContactBlock[] = [];
  const xyz: number[] = [];
  for (const [name, block] of Object.entries(locations)) {
    if (/^\d+$/.test(name)) return null;
    const points = Array.isArray(block?.locations) ? block.locations : [];
    blocks.push({ name, first: xyz.length / 3, count: points.length });
    for (const [x, y, z] of points) xyz.push(x, y, z);
  }
  if (xyz.length / 3 !== contacts) return null;
  return { positions: Float32Array.from(xyz), blocks };
}
