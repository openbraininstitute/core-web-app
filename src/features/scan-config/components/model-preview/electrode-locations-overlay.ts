import {
  categoricalColor,
  MAX_DISTINCT_COLORS,
} from '@/features/scan-config/components/color-by/palette';

import type {
  ElectrodeLocationPoint,
  ElectrodeLocationsBlockSummary,
  ElectrodeLocationsDictionarySummary,
} from '@/api/one/generated/extracellular-locations-block-dictionary-summary';

/** Hardcoded scan-config dictionary key for extracellular electrode arrays. */
export const ELECTRODE_LOCATIONS_CONFIG_KEY = 'electrode_locations';

/** World-coordinate overlay group passed to morphoviewer `overlays`. */
export interface CircuitOverlayGroup {
  color: string;
  coordinates: Float32Array;
  /** Block name this group came from (for debugging / future legend). */
  name: string;
  /** `electrodes` = contact sites; `origin` = array placement origin. */
  kind?: 'electrodes' | 'origin';
}

/** Stable FNV-1a-ish hash so a block name always maps to the same palette colour. */
function hashBlockName(name: string): number {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % MAX_DISTINCT_COLORS;
}

export function colorForElectrodeBlock(name: string): string {
  return categoricalColor(hashBlockName(name));
}

/** Contrasting colour for the origin marker of a named block (not the contact colour). */
export function colorForElectrodeOrigin(name: string): string {
  return categoricalColor(
    (hashBlockName(name) + Math.floor(MAX_DISTINCT_COLORS / 3)) % MAX_DISTINCT_COLORS
  );
}

function flattenLocations(locations: ElectrodeLocationPoint[]): Float32Array {
  const out = new Float32Array(locations.length * 3);
  for (let i = 0; i < locations.length; i++) {
    const point = locations[i];
    const offset = i * 3;
    out[offset] = point[0];
    out[offset + 1] = point[1];
    out[offset + 2] = point[2];
  }
  return out;
}

function readOrigin(entry: ElectrodeLocationsBlockSummary): ElectrodeLocationPoint | null {
  const { origin_x: x, origin_y: y, origin_z: z } = entry;
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return null;
  if (![x, y, z].every(Number.isFinite)) return null;
  return [x, y, z];
}

/**
 * Map a dictionary summary (live POST or stored asset) into coloured overlay
 * groups. Each block yields electrode contacts plus a distinct-colour origin
 * sphere when `origin_*` is present. Blocks without a usable `locations` array
 * are skipped.
 */
export function electrodeSummaryToOverlays(
  summary: ElectrodeLocationsDictionarySummary | null | undefined
): CircuitOverlayGroup[] {
  if (!summary) return [];

  const groups: CircuitOverlayGroup[] = [];
  for (const [name, entry] of Object.entries(summary)) {
    const locations = entry?.locations;
    if (!Array.isArray(locations) || locations.length === 0) continue;
    groups.push({
      name,
      kind: 'electrodes',
      color: colorForElectrodeBlock(name),
      coordinates: flattenLocations(locations as ElectrodeLocationPoint[]),
    });

    const origin = readOrigin(entry);
    if (origin) {
      groups.push({
        name: `${name} (origin)`,
        kind: 'origin',
        color: colorForElectrodeOrigin(name),
        coordinates: Float32Array.from(origin),
      });
    }
  }
  // Stable order for React Query / morphoviewer identity.
  groups.sort((a, b) => a.name.localeCompare(b.name));
  return groups;
}

/** True when the config value looks like a non-empty electrode_locations dictionary. */
export function hasElectrodeLocationsDictionary(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value as object).length > 0
  );
}
