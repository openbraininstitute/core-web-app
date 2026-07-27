import {
  categoricalColor,
  MAX_DISTINCT_COLORS,
} from '@/features/scan-config/components/color-by/palette';

import type {
  ElectrodeLocationPoint,
  ElectrodeLocationsBlockSummary,
  ElectrodeLocationsDictionarySummary,
} from '@/api/one/generated/extracellular-locations-block-dictionary-summary';

/**
 * Scan-config dictionary key for extracellular electrode arrays.
 *
 * Hardcoded (not discovered via schema) so overlay fetch, form selection, and
 * 3D↔form sync all share one stable string.
 */
export const ELECTRODE_LOCATIONS_CONFIG_KEY = 'electrode_locations';

/**
 * One coloured point-cloud group for morphoviewer `overlays`.
 *
 * Why this shape: morphoviewer paints world XYZ spheres; the host also needs
 * `id` / `origin` / `rotation` so drag-rotate can write back into the form.
 */
export interface CircuitOverlayGroup {
  /** CSS colour (opaque hex/rgb). Used as the point-cloud palette entry. */
  color: string;
  /** Interleaved world XYZ for every sphere in this group. */
  coordinates: Float32Array;
  /** Block name this group came from (debug / sort key). */
  name: string;
  /**
   * Stable transform id — the electrode block name.
   * Contacts and origin spheres share this so one drag moves the whole array.
   */
  id: string;
  /** `electrodes` = contact sites; `origin` = placement pivot marker. */
  kind?: 'electrodes' | 'origin';
  /** Placement origin (rotation pivot) in world XYZ. */
  origin?: [number, number, number];
  /** Absolute placement rotations in degrees (Obi-One extrinsic ZXY). */
  rotation?: { x?: number; y?: number; z?: number };
}

/**
 * Hash a block name into `[0, MAX_DISTINCT_COLORS)`.
 *
 * Why: `categoricalColor(index)` must be stable across sessions so the same
 * electrode name keeps the same colour without storing overrides.
 *
 * @param name - Electrode dictionary entry name
 * @returns Palette index
 */
function hashBlockName(name: string): number {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % MAX_DISTINCT_COLORS;
}

/**
 * Colour for electrode contact spheres of a named block.
 *
 * How: hash the name → Okabe–Ito / Tableau categorical palette.
 * Why: reuses the circuit color-by palette (colorblind-safer) and stays stable
 * per block name without per-user colour config.
 *
 * @param name - Electrode block name (`electrode_locations` key)
 * @returns CSS hex colour
 *
 * @example
 * colorForElectrodeBlock('probe_a') === colorForElectrodeBlock('probe_a');
 */
export function colorForElectrodeBlock(name: string): string {
  return categoricalColor(hashBlockName(name));
}

/**
 * Colour for the origin marker of a named block.
 *
 * How: same hash as contacts, offset by ~⅓ of the palette.
 * Why: tip must contrast with contact spheres so the pivot is obvious in 3D.
 *
 * @param name - Electrode block name
 * @returns CSS hex colour distinct from {@link colorForElectrodeBlock}
 */
export function colorForElectrodeOrigin(name: string): string {
  return categoricalColor(
    (hashBlockName(name) + Math.floor(MAX_DISTINCT_COLORS / 3)) % MAX_DISTINCT_COLORS
  );
}

/**
 * Pack API `locations` tuples into a morphoviewer-friendly Float32Array.
 *
 * @param locations - World XYZ points from Obi-One summary
 * @returns Interleaved `[x0,y0,z0, x1,y1,z1, …]`
 */
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

/**
 * Read a complete finite `origin_*` triple from a summary block.
 *
 * @returns `[x,y,z]` or `null` when any axis is missing / non-finite
 */
function readOrigin(entry: ElectrodeLocationsBlockSummary): ElectrodeLocationPoint | null {
  const { origin_x: x, origin_y: y, origin_z: z } = entry;
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return null;
  if (![x, y, z].every(Number.isFinite)) return null;
  return [x, y, z];
}

/**
 * Coerce a summary rotation field (scalar or single-element sweep array) to degrees.
 *
 * Why arrays: scan-config parameter sweeps store `[value]`; the viewer only
 * needs the first scalar for placement.
 */
function readScalarDegrees(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value) && typeof value[0] === 'number' && Number.isFinite(value[0])) {
    return value[0];
  }
  return undefined;
}

/**
 * Read optional `rotation_*` from a summary block (defaults missing axes to 0).
 */
function readRotation(entry: ElectrodeLocationsBlockSummary): {
  x?: number;
  y?: number;
  z?: number;
} {
  const x = readScalarDegrees(entry.rotation_x);
  const y = readScalarDegrees(entry.rotation_y);
  const z = readScalarDegrees(entry.rotation_z);
  if (x === undefined && y === undefined && z === undefined) return {};
  return { x: x ?? 0, y: y ?? 0, z: z ?? 0 };
}

/**
 * Map an Obi-One dictionary summary into morphoviewer overlay groups.
 *
 * How: each block with `locations` → contact cloud + (optional) origin sphere,
 * both sharing `id === blockName` so one gesture transforms the whole array.
 * Why: the live POST / stored asset already has world contact sites; this is
 * the authoritative geometry once the summary returns.
 *
 * @param summary - Live `block_dictionary_summary` or downloaded asset JSON
 * @returns Sorted overlay groups (empty when summary is nullish)
 *
 * @example
 * const groups = electrodeSummaryToOverlays(apiResponse);
 * // → MorphoViewerSmallCircuit overlays={groups}
 */
export function electrodeSummaryToOverlays(
  summary: ElectrodeLocationsDictionarySummary | null | undefined
): CircuitOverlayGroup[] {
  if (!summary) return [];

  const groups: CircuitOverlayGroup[] = [];
  for (const [name, entry] of Object.entries(summary)) {
    const locations = entry?.locations;
    if (!Array.isArray(locations) || locations.length === 0) continue;
    const origin = readOrigin(entry);
    const rotation = readRotation(entry);
    const placement = {
      ...(origin ? { origin } : {}),
      ...(Object.keys(rotation).length > 0 ? { rotation } : {}),
    };

    groups.push({
      name,
      id: name,
      kind: 'electrodes',
      color: colorForElectrodeBlock(name),
      coordinates: flattenLocations(locations as ElectrodeLocationPoint[]),
      ...placement,
    });

    if (origin) {
      groups.push({
        name: `${name} (origin)`,
        id: name,
        kind: 'origin',
        color: colorForElectrodeOrigin(name),
        coordinates: Float32Array.from(origin),
        ...placement,
      });
    }
  }
  // Stable order for React Query / morphoviewer identity.
  groups.sort((a, b) => a.name.localeCompare(b.name));
  return groups;
}

/**
 * Type guard: value is a non-empty plain object dictionary.
 *
 * Why: enables live-overlay mode only when `config.electrode_locations` actually
 * has blocks (avoids POSTing `{}` / treating arrays as dictionaries).
 *
 * @param value - Candidate `config.electrode_locations`
 */
export function hasElectrodeLocationsDictionary(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value as object).length > 0
  );
}

/** Same as {@link readScalarDegrees} for live form config values. */
function readConfigScalar(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value) && typeof value[0] === 'number' && Number.isFinite(value[0])) {
    return value[0];
  }
  return undefined;
}

/** Read complete `origin_*` from a live config block (not API summary). */
function readConfigOrigin(block: Record<string, unknown>): ElectrodeLocationPoint | null {
  const x = readConfigScalar(block.origin_x);
  const y = readConfigScalar(block.origin_y);
  const z = readConfigScalar(block.origin_z);
  if (x === undefined || y === undefined || z === undefined) return null;
  return [x, y, z];
}

/** Read optional `rotation_*` from a live config block. */
function readConfigRotation(block: Record<string, unknown>): {
  x?: number;
  y?: number;
  z?: number;
} {
  const x = readConfigScalar(block.rotation_x);
  const y = readConfigScalar(block.rotation_y);
  const z = readConfigScalar(block.rotation_z);
  if (x === undefined && y === undefined && z === undefined) return {};
  return { x: x ?? 0, y: y ?? 0, z: z ?? 0 };
}

/**
 * Build optimistic overlays from live form config before the summary API returns.
 *
 * How: place `n_electrodes` contacts along local +Y at `spacing`, then apply
 * Obi-One ZXY rotation about `origin_*`.
 * Why: new / just-moved electrodes must stay visible and keep orientation while
 * the debounced `block_dictionary_summary` request is in flight — otherwise the
 * probe flashes to an axis-aligned stub (rotation 0) then snaps back.
 *
 * @param dictionary - Live `config.electrode_locations`
 * @returns Placeholder overlay groups (API overlays replace these via merge)
 */
export function electrodeDictionaryToPlaceholderOverlays(
  dictionary: Record<string, unknown> | null | undefined
): CircuitOverlayGroup[] {
  if (!dictionary) return [];

  const groups: CircuitOverlayGroup[] = [];
  for (const [name, raw] of Object.entries(dictionary)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const block = raw as Record<string, unknown>;
    const origin = readConfigOrigin(block);
    if (!origin) continue;

    const rotation = readConfigRotation(block);
    const placement = {
      origin,
      ...(Object.keys(rotation).length > 0 ? { rotation } : {}),
    };

    const n = Math.max(1, Math.min(512, Math.floor(readConfigScalar(block.n_electrodes) ?? 1)));
    const spacing = Math.max(1, readConfigScalar(block.spacing) ?? 20);
    // Stub along local +Y, then apply Obi-One ZXY rotation so a post-drag
    // placeholder does not flash back to an axis-aligned (rotation-0) probe.
    const rx = rotation.x ?? 0;
    const ry = rotation.y ?? 0;
    const rz = rotation.z ?? 0;
    const mat = rotationMatrixZXY(rx, ry, rz);
    const coords = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const [dx, dy, dz] = applyMat3(mat, 0, i * spacing, 0);
      const o = i * 3;
      coords[o] = origin[0] + dx;
      coords[o + 1] = origin[1] + dy;
      coords[o + 2] = origin[2] + dz;
    }

    groups.push({
      name,
      id: name,
      kind: 'electrodes',
      color: colorForElectrodeBlock(name),
      coordinates: coords,
      ...placement,
    });
    groups.push({
      name: `${name} (origin)`,
      id: name,
      kind: 'origin',
      color: colorForElectrodeOrigin(name),
      coordinates: Float32Array.from(origin),
      ...placement,
    });
  }
  groups.sort((a, b) => a.name.localeCompare(b.name));
  return groups;
}

/**
 * Merge placeholder + API overlays by electrode id.
 *
 * How: API wins for any id it already has; placeholders fill only missing ids.
 * Why: after the first summary, keep accurate contact sites from Obi-One while
 * still showing brand-new blocks that the last response has not included yet.
 *
 * @param placeholders - From {@link electrodeDictionaryToPlaceholderOverlays}
 * @param fromApi - From {@link electrodeSummaryToOverlays}
 */
export function mergeElectrodeOverlays(
  placeholders: CircuitOverlayGroup[],
  fromApi: CircuitOverlayGroup[]
): CircuitOverlayGroup[] {
  if (placeholders.length === 0) return fromApi;
  if (fromApi.length === 0) return placeholders;

  const apiIds = new Set(
    fromApi.filter((group) => group.kind === 'electrodes' || !group.kind).map((group) => group.id)
  );
  const pending = placeholders.filter((group) => !apiIds.has(group.id));
  if (pending.length === 0) return fromApi;
  return [...fromApi, ...pending].sort((a, b) => a.name.localeCompare(b.name));
}

const ORIGIN_SEED_DECIMALS = 3;

function roundCoord(value: number): number {
  const factor = 10 ** ORIGIN_SEED_DECIMALS;
  return Math.round(value * factor) / factor;
}

/**
 * Obi-One extrinsic ZXY Euler (degrees) → row-major 3×3 matrix.
 *
 * Why shared with morphoviewer rotate math: placeholders must use the same
 * convention as live drag-rotate so orientation never disagrees.
 */
function rotationMatrixZXY(xDeg: number, yDeg: number, zDeg: number): Float64Array {
  const x = (xDeg * Math.PI) / 180;
  const y = (yDeg * Math.PI) / 180;
  const z = (zDeg * Math.PI) / 180;
  const cx = Math.cos(x);
  const sx = Math.sin(x);
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cz = Math.cos(z);
  const sz = Math.sin(z);
  // R = Rz * Rx * Ry
  const rx = new Float64Array([1, 0, 0, 0, cx, -sx, 0, sx, cx]);
  const ry = new Float64Array([cy, 0, sy, 0, 1, 0, -sy, 0, cy]);
  const rz = new Float64Array([cz, -sz, 0, sz, cz, 0, 0, 0, 1]);
  return mulMat3(mulMat3(rz, rx), ry);
}

function mulMat3(a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out;
}

function applyMat3(m: Float64Array, x: number, y: number, z: number): [number, number, number] {
  return [
    m[0] * x + m[1] * y + m[2] * z,
    m[3] * x + m[4] * y + m[5] * z,
    m[6] * x + m[7] * y + m[8] * z,
  ];
}

/**
 * Seed a newly added electrode block’s `origin_*` at the circuit scene centre.
 *
 * How: called from `BlockDictionary` on Add, using {@link circuitSceneAnchorAtom}.
 * Why: schema defaults are often `(0,0,0)` far from the loaded circuit; without
 * seeding, new markers appear off-camera until the user edits origin by hand.
 *
 * @param initial - Schema-default block fields
 * @param anchor - Circuit bbox / soma average from the viewer, or null
 * @returns `initial` unchanged when there is no anchor or no origin fields
 */
export function seedElectrodeInitialOrigin(
  initial: Record<string, unknown>,
  anchor: readonly [number, number, number] | null | undefined
): Record<string, unknown> {
  if (!anchor) return initial;
  if (!('origin_x' in initial) && !('origin_y' in initial) && !('origin_z' in initial)) {
    return initial;
  }
  return {
    ...initial,
    ...('origin_x' in initial ? { origin_x: roundCoord(anchor[0]) } : {}),
    ...('origin_y' in initial ? { origin_y: roundCoord(anchor[1]) } : {}),
    ...('origin_z' in initial ? { origin_z: roundCoord(anchor[2]) } : {}),
  };
}
