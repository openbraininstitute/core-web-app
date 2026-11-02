import { LEG_BY_NAME } from '@/features/scan-config/components/model-preview/neuromechfly/kinematics';

import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type {
  IBodyKinematics,
  IBodyPreview,
  IPreviewForce,
  IPreviewOverride,
  TMatrix,
} from '@/features/scan-config/components/model-preview/neuromechfly/kinematics';
import type { Config, ConfigValue } from '@/features/scan-config/types';
import type { MorphoViewerOverlayTransformEvent, MorphoViewerWorldMesh } from '@/morpho-viewer';

/** Root elements of obi-one's `Brian2NeuroMechFlySimulationScanConfig`. */
export const ARENA_KEY = 'arena';
export const SOURCES_KEY = 'odour_sources';
export const WALLS_KEY = 'walls';
export const FORCES_KEY = 'forces';
export const LEG_OVERRIDES_KEY = 'leg_overrides';

/** Every overlay this scene draws carries this prefix, so a drop knows whose it is. */
export const NEUROMECHFLY_OVERLAY_PREFIX = 'neuromechfly:';

/** What the viewer's world is measured in: µm, as circuits are, so the soma shading holds. */
export const UM_PER_MM = 1000;

// Arena geometry the closed-loop task fixes (obi-one `neuromechfly.config.ArenaConfig`), in mm.
const SOURCE_HEIGHT_MM = 1.5;
const WALL_THICKNESS_MM = 1.2;
const WALL_HEIGHT_MM = 3;

/** How far the floor reaches past the fly, the sources and the walls, in mm. */
const FLOOR_MARGIN_MM = 8;
const FLOOR_MIN_HALF_MM = 12;
const GRID_STEP_MM = 5;
const GRID_LINE_MM = 0.06;
/** The heading arrow, ahead of the fly's origin, in mm. */
const ARROW_FROM_MM = 3;
const ARROW_TO_MM = 7.5;
const ARROW_DOTS = 7;
const RING_DOTS = 28;

/** Marker size for the arena's handles, in world units (µm). */
export const NEUROMECHFLY_MARKER_RADIUS = 330;

type Matrix16 = NonNullable<MorphoViewerWorldMesh['matrix']>;
/** A 4x4 matrix by rows. */
type Rows = number[][];

/**
 * Where BANC v888 (µm; +x left, +y posterior, +z dorsal) sits in the NeuroMechFly body (mm; +x
 * forward, +y left, +z up): the axes mapped at true size, with the centroid of the central brain
 * and optic lobes at the centre of the head. For embodied circuits whose body interface predates
 * its `placement` field — the only one of which is BANC.
 */
const BANC_IN_BODY: Rows = [
  [0, -0.001, 0, 1.11937],
  [0.001, 0, 0, -0.4794],
  [0, 0, 0.001, 0.90256],
  [0, 0, 0, 1],
];

export interface IBodyInterface {
  body: string;
  /** Circuit µm to body mm, by rows. */
  placement?: Rows | null;
}

interface ISource {
  name: string;
  x: number;
  y: number;
  /** A parameter sweep: drawn at its first value, and not dragged. */
  swept: boolean;
}

interface IWall {
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  swept: boolean;
}

export interface IArena {
  sources: ISource[];
  walls: IWall[];
  /** Degrees, anticlockwise from +X. */
  heading: number;
  headingSwept: boolean;
  captureRadius: number;
}

export function isEmbodied(bodyInterface: IBodyInterface | null | undefined): boolean {
  return Boolean(bodyInterface?.body.startsWith('NeuroMechFly'));
}

export function isNeuroMechFlyConfig(config: Config | null | undefined): config is Config {
  return Boolean(config && ARENA_KEY in config && SOURCES_KEY in config);
}

export function isNeuroMechFlyOverlay(id: string): boolean {
  return id.startsWith(NEUROMECHFLY_OVERLAY_PREFIX);
}

function record(value: ConfigValue | undefined): Record<string, ConfigValue> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, ConfigValue>)
    : {};
}

/** A number field and whether it is swept; a sweep is read at its first value. */
function readNumber(value: ConfigValue | undefined, fallback: number): [number, boolean] {
  if (Array.isArray(value)) {
    const first = Number(value[0]);
    return [Number.isFinite(first) ? first : fallback, true];
  }
  const number = Number(value);
  return [
    value !== null && value !== undefined && Number.isFinite(number) ? number : fallback,
    false,
  ];
}

export function readArena(config: Config): IArena {
  const arena = record(config[ARENA_KEY]);
  const [heading, headingSwept] = readNumber(arena.start_heading, 0);
  const [captureRadius] = readNumber(arena.capture_radius, 2.5);
  const sources = Object.entries(record(config[SOURCES_KEY])).map(([name, value]) => {
    const block = record(value);
    const [x, sweptX] = readNumber(block.x, 25);
    const [y, sweptY] = readNumber(block.y, 0);
    return { name, x, y, swept: sweptX || sweptY };
  });
  const walls = Object.entries(record(config[WALLS_KEY])).map(([name, value]) => {
    const block = record(value);
    const [x0, a] = readNumber(block.x0, 15);
    const [y0, b] = readNumber(block.y0, -4);
    const [x1, c] = readNumber(block.x1, 15);
    const [y1, d] = readNumber(block.y1, 6);
    return { name, x0, y0, x1, y1, swept: a || b || c || d };
  });
  return { sources, walls, heading, headingSwept, captureRadius };
}

function multiply(a: Rows, b: Rows): Rows {
  return a.map((row) => [0, 1, 2, 3].map((c) => row.reduce((sum, v, k) => sum + v * b[k][c], 0)));
}

function toColumnMajor(rows: Rows): Matrix16 {
  const out: number[] = [];
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out.push(rows[r][c]);
  return out as Matrix16;
}

function scaling(factor: number): Rows {
  return [
    [factor, 0, 0, 0],
    [0, factor, 0, 0],
    [0, 0, factor, 0],
    [0, 0, 0, 1],
  ];
}

/** A turn about +z by `degrees`, then a shift to (x, y, z). */
function placed(degrees: number, x = 0, y = 0, z = 0): Rows {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    [cos, -sin, 0, x],
    [sin, cos, 0, y],
    [0, 0, 1, z],
    [0, 0, 0, 1],
  ];
}

/**
 * The fly's matrices in the viewer's world (the arena, in µm): the body mesh, given in mm, and
 * the circuit, given in µm. Both stand at the origin, turned to the start heading.
 */
export function flyMatrices(bodyInterface: IBodyInterface, heading: number) {
  const fly = placed(heading);
  const placement = bodyInterface.placement ?? BANC_IN_BODY;
  return {
    body: toColumnMajor(multiply(fly, scaling(UM_PER_MM))),
    cells: toColumnMajor(multiply(multiply(fly, scaling(UM_PER_MM)), placement)),
  };
}

function box(
  id: string,
  color: string,
  center: [number, number, number],
  size: [number, number, number],
  options: Partial<MorphoViewerWorldMesh> = {}
): MorphoViewerWorldMesh {
  return {
    id,
    color,
    box: {
      center: center.map((v) => v * UM_PER_MM) as [number, number, number],
      size: size.map((v) => v * UM_PER_MM) as [number, number, number],
    },
    ...options,
  };
}

interface IArenaColors {
  floor: string;
  grid: string;
  wall: string;
  /** A wall's handles, set off from the wall itself. */
  wallHandle: string;
}

export function arenaColors(dark: boolean): IArenaColors {
  return dark
    ? { floor: '#1d2330', grid: '#2f3747', wall: '#7c8aa5', wallHandle: '#e2e8f0' }
    : { floor: '#eef0f4', grid: '#d5dae3', wall: '#8a96ad', wallHandle: '#334155' };
}

/**
 * The floor (framed, so a camera reset shows the whole arena), its grid, and the walls. The floor
 * reaches past the fly's start, the sources, the walls and any `alsoUnder` (x, y in mm).
 */
export function arenaMeshes(
  arena: IArena,
  colors: IArenaColors,
  alsoUnder: readonly number[][] = []
): MorphoViewerWorldMesh[] {
  const xs = [
    0,
    ...arena.sources.map((s) => s.x),
    ...arena.walls.flatMap((w) => [w.x0, w.x1]),
    ...alsoUnder.map((p) => p[0]),
  ];
  const ys = [
    0,
    ...arena.sources.map((s) => s.y),
    ...arena.walls.flatMap((w) => [w.y0, w.y1]),
    ...alsoUnder.map((p) => p[1]),
  ];
  const snap = (v: number, up: boolean) =>
    (up ? Math.ceil(v / GRID_STEP_MM) : Math.floor(v / GRID_STEP_MM)) * GRID_STEP_MM;
  const x0 = snap(Math.min(-FLOOR_MIN_HALF_MM, Math.min(...xs) - FLOOR_MARGIN_MM), false);
  const x1 = snap(Math.max(FLOOR_MIN_HALF_MM, Math.max(...xs) + FLOOR_MARGIN_MM), true);
  const y0 = snap(Math.min(-FLOOR_MIN_HALF_MM, Math.min(...ys) - FLOOR_MARGIN_MM), false);
  const y1 = snap(Math.max(FLOOR_MIN_HALF_MM, Math.max(...ys) + FLOOR_MARGIN_MM), true);
  const meshes: MorphoViewerWorldMesh[] = [
    box(
      'arena:floor',
      colors.floor,
      [(x0 + x1) / 2, (y0 + y1) / 2, -0.05],
      [x1 - x0, y1 - y0, 0.1],
      { fit: true }
    ),
  ];
  for (let x = x0; x <= x1; x += GRID_STEP_MM) {
    meshes.push(
      box(
        `arena:grid:x${x}`,
        colors.grid,
        [x, (y0 + y1) / 2, 0.003],
        [GRID_LINE_MM, y1 - y0, 0.006]
      )
    );
  }
  for (let y = y0; y <= y1; y += GRID_STEP_MM) {
    meshes.push(
      box(
        `arena:grid:y${y}`,
        colors.grid,
        [(x0 + x1) / 2, y, 0.003],
        [x1 - x0, GRID_LINE_MM, 0.006]
      )
    );
  }
  for (const wall of arena.walls) {
    const length = Math.hypot(wall.x1 - wall.x0, wall.y1 - wall.y0);
    const angle = (Math.atan2(wall.y1 - wall.y0, wall.x1 - wall.x0) * 180) / Math.PI;
    meshes.push({
      id: `arena:wall:${wall.name}`,
      color: colors.wall,
      opacity: 0.7,
      box: {
        center: [0, 0, 0],
        size: [length * UM_PER_MM, WALL_THICKNESS_MM * UM_PER_MM, WALL_HEIGHT_MM * UM_PER_MM],
      },
      matrix: toColumnMajor(
        placed(
          angle,
          ((wall.x0 + wall.x1) / 2) * UM_PER_MM,
          ((wall.y0 + wall.y1) / 2) * UM_PER_MM,
          (WALL_HEIGHT_MM / 2) * UM_PER_MM
        )
      ),
    });
  }
  return meshes;
}

function points(xyzInMm: [number, number, number][]): Float32Array {
  return Float32Array.from(xyzInMm.flat().map((v) => v * UM_PER_MM));
}

function um(xyzInMm: [number, number, number]): [number, number, number] {
  return [xyzInMm[0] * UM_PER_MM, xyzInMm[1] * UM_PER_MM, xyzInMm[2] * UM_PER_MM];
}

const SOURCE_COLOR = '#f59e0b';
const RING_COLOR = '#fcd34d';
const HEADING_COLOR = '#22c55e';

export const overlayIds = {
  source: (name: string) => `${NEUROMECHFLY_OVERLAY_PREFIX}source:${name}`,
  force: (name: string) => `${NEUROMECHFLY_OVERLAY_PREFIX}force:${name}`,
  forceShaft: (name: string) => `${NEUROMECHFLY_OVERLAY_PREFIX}force-shaft:${name}`,
  wallEnd: (name: string, end: 'start' | 'end' | 'middle') =>
    `${NEUROMECHFLY_OVERLAY_PREFIX}wall:${end}:${name}`,
  heading: `${NEUROMECHFLY_OVERLAY_PREFIX}heading`,
};

/**
 * The arena's handles: each odour source with its capture ring (dragged across the floor
 * together), each wall's two ends and middle, and the arrow the fly starts along, which turns
 * about the fly.
 */
export function arenaOverlays(arena: IArena, colors: IArenaColors): ICircuitOverlayGroup[] {
  const groups: ICircuitOverlayGroup[] = [];
  for (const source of arena.sources) {
    const id = overlayIds.source(source.name);
    const ring: [number, number, number][] = Array.from({ length: RING_DOTS }, (_, i) => {
      const angle = (2 * Math.PI * i) / RING_DOTS;
      return [
        source.x + arena.captureRadius * Math.cos(angle),
        source.y + arena.captureRadius * Math.sin(angle),
        0.05,
      ];
    });
    const common = {
      id,
      name: source.name,
      origin: um([source.x, source.y, SOURCE_HEIGHT_MM]),
      drag: 'xy' as const,
      interactive: !source.swept,
    };
    groups.push({
      ...common,
      color: SOURCE_COLOR,
      // The pole first: a group's first point is where the viewer reads it back from.
      coordinates: points([
        [source.x, source.y, SOURCE_HEIGHT_MM],
        [source.x, source.y, SOURCE_HEIGHT_MM * 0.6],
        [source.x, source.y, SOURCE_HEIGHT_MM * 0.2],
      ]),
    });
    groups.push({ ...common, color: RING_COLOR, coordinates: points(ring) });
  }
  for (const wall of arena.walls) {
    const ends = {
      start: [wall.x0, wall.y0],
      end: [wall.x1, wall.y1],
      middle: [(wall.x0 + wall.x1) / 2, (wall.y0 + wall.y1) / 2],
    } as const;
    for (const [end, [x, y]] of Object.entries(ends) as [
      'start' | 'end' | 'middle',
      readonly [number, number],
    ][]) {
      const top: [number, number, number] = [x, y, WALL_HEIGHT_MM];
      groups.push({
        id: overlayIds.wallEnd(wall.name, end),
        name: wall.name,
        color: colors.wallHandle,
        coordinates: points([top]),
        origin: um(top),
        drag: 'xy',
        interactive: !wall.swept,
      });
    }
  }
  const angle = (arena.heading * Math.PI) / 180;
  const along = (distance: number, side = 0): [number, number, number] => [
    distance * Math.cos(angle) - side * Math.sin(angle),
    distance * Math.sin(angle) + side * Math.cos(angle),
    0.05,
  ];
  const shaft = Array.from({ length: ARROW_DOTS }, (_, i) =>
    along(ARROW_FROM_MM + ((ARROW_TO_MM - ARROW_FROM_MM) * i) / (ARROW_DOTS - 1))
  );
  const head = [along(ARROW_TO_MM - 0.9, 0.7), along(ARROW_TO_MM - 0.9, -0.7)];
  groups.push({
    id: overlayIds.heading,
    name: 'Start heading',
    color: HEADING_COLOR,
    coordinates: points([...shaft, ...head]),
    origin: [0, 0, 0.05 * UM_PER_MM],
    // In [0, 360), as the viewer reports a turn, so it knows the form has taken its drop.
    rotation: { z: ((arena.heading % 360) + 360) % 360 },
    drag: 'turn-z',
    interactive: !arena.headingSwept,
  });
  return groups;
}

/** The handle of the block the form has open. */
export function highlightedOverlay(
  selectedRootElement: string | undefined,
  selectedEntry: string | undefined
): string | null {
  if (selectedRootElement === ARENA_KEY) return overlayIds.heading;
  if (!selectedEntry) return null;
  if (selectedRootElement === SOURCES_KEY) return overlayIds.source(selectedEntry);
  if (selectedRootElement === WALLS_KEY) return overlayIds.wallEnd(selectedEntry, 'middle');
  if (selectedRootElement === FORCES_KEY) return overlayIds.force(selectedEntry);
  return null;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function withBlock(
  config: Config,
  key: string,
  name: string | null,
  update: (block: Record<string, ConfigValue>) => Record<string, ConfigValue>
): Config {
  if (name === null) return { ...config, [key]: update(record(config[key])) };

  const dictionary = record(config[key]);
  if (!(name in dictionary)) return config;
  return { ...config, [key]: { ...dictionary, [name]: update(record(dictionary[name])) } };
}

/**
 * Write a dropped handle back into the form: positions in mm, the heading in degrees, a force in
 * µN (which needs the segments its arrows start from).
 */
export function applyNeuroMechFlyOverlayTransform(
  config: Config,
  event: MorphoViewerOverlayTransformEvent,
  segments?: TBodySegments | null
): Config {
  const arena = readArena(config);
  const mm = (v: number) => roundTo(v / UM_PER_MM, 2);
  for (const force of readPerturbations(config).forces) {
    const centre = segments?.[force.segment];
    if (event.id !== overlayIds.force(force.name) || !centre) continue;

    const anchor = turned(centre, arena.heading);
    const tip = [event.origin.x, event.origin.y, event.origin.z].map((v) => v / UM_PER_MM);
    const pushed = tip.map(
      (v, axis) => ((v - anchor[axis]) * UM_PER_MM) / ARROW_UM_PER_MICRONEWTON
    );
    const vector =
      force.frame === 'body' ? turned(pushed as [number, number, number], -arena.heading) : pushed;
    return withBlock(config, FORCES_KEY, force.name, (block) => ({
      ...block,
      force_x: roundTo(vector[0], 1),
      force_y: roundTo(vector[1], 1),
      force_z: roundTo(vector[2], 1),
    }));
  }
  if (event.id === overlayIds.heading) {
    const heading = (((event.rotation.z % 360) + 540) % 360) - 180;
    return withBlock(config, ARENA_KEY, null, (block) => ({
      ...block,
      start_heading: roundTo(heading, 2),
    }));
  }
  for (const source of arena.sources) {
    if (event.id !== overlayIds.source(source.name)) continue;
    return withBlock(config, SOURCES_KEY, source.name, (block) => ({
      ...block,
      x: mm(event.origin.x),
      y: mm(event.origin.y),
    }));
  }
  for (const wall of arena.walls) {
    const x = mm(event.origin.x);
    const y = mm(event.origin.y);
    if (event.id === overlayIds.wallEnd(wall.name, 'start')) {
      return withBlock(config, WALLS_KEY, wall.name, (block) => ({ ...block, x0: x, y0: y }));
    }
    if (event.id === overlayIds.wallEnd(wall.name, 'end')) {
      return withBlock(config, WALLS_KEY, wall.name, (block) => ({ ...block, x1: x, y1: y }));
    }
    if (event.id === overlayIds.wallEnd(wall.name, 'middle')) {
      const dx = x - (wall.x0 + wall.x1) / 2;
      const dy = y - (wall.y0 + wall.y1) / 2;
      return withBlock(config, WALLS_KEY, wall.name, (block) => ({
        ...block,
        x0: roundTo(wall.x0 + dx, 2),
        y0: roundTo(wall.y0 + dy, 2),
        x1: roundTo(wall.x1 + dx, 2),
        y1: roundTo(wall.y1 + dy, 2),
      }));
    }
  }
  return config;
}

/**
 * The centre of mass of each segment a force can push, with the fly standing at the origin facing
 * +X, in body mm (minnick2026/viewer/export_body.py): where the closed loop applies a force.
 */
export type TBodySegments = Record<string, [number, number, number]>;

interface IForce extends IPreviewForce {
  name: string;
  swept: boolean;
}

interface ILegOverride extends IPreviewOverride {
  name: string;
}

export function readPerturbations(config: Config): { forces: IForce[]; overrides: ILegOverride[] } {
  const forces = Object.entries(record(config[FORCES_KEY])).map(([name, value]) => {
    const block = record(value);
    const [x, a] = readNumber(block.force_x, 0);
    const [y, b] = readNumber(block.force_y, 0);
    const [z, c] = readNumber(block.force_z, 0);
    return {
      name,
      segment: String(block.segment ?? 'thorax'),
      frame: block.frame === 'arena' ? ('arena' as const) : ('body' as const),
      force: [x, y, z] as [number, number, number],
      start: readNumber(block.start, 1000)[0],
      duration: readNumber(block.duration, 200)[0],
      frequency: readNumber(block.frequency, 0)[0],
      swept: a || b || c,
    };
  });
  const overrides = Object.entries(record(config[LEG_OVERRIDES_KEY])).map(([name, value]) => {
    const block = record(value);
    return {
      name,
      leg: String(block.leg ?? 'left_front'),
      mode: String(block.mode ?? 'lift'),
      start: readNumber(block.start, 1000)[0],
      duration: readNumber(block.duration, 500)[0],
      joint: String(block.joint ?? 'tibia'),
      amplitude: readNumber(block.amplitude, 20)[0],
      frequency: readNumber(block.frequency, 5)[0],
    };
  });
  return { forces, overrides };
}

/** (x, y, z) turned about +z by `degrees`. */
function turned(vector: readonly number[], degrees: number): [number, number, number] {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [vector[0] * cos - vector[1] * sin, vector[0] * sin + vector[1] * cos, vector[2]];
}

/** µm of arrow per µN of force: the fly's weight, about 10 µN, is a 3 mm arrow. */
export const ARROW_UM_PER_MICRONEWTON = 300;
/** Spacing of an arrow's shaft dots, in µm. */
const SHAFT_DOT_UM = 220;
export const FORCE_COLOR = '#ef4444';
const FORCE_SHAFT_COLOR = '#fca5a5';

/**
 * An arrow per force, from the centre of the segment it pushes, turned with the fly when the force
 * is in its frame. The tip is the handle: drag it to set the force.
 */
export function forceOverlays(
  forces: IForce[],
  segments: TBodySegments,
  heading: number
): ICircuitOverlayGroup[] {
  const groups: ICircuitOverlayGroup[] = [];
  for (const force of forces) {
    const centre = segments[force.segment];
    if (!centre) continue;

    const anchor = turned(centre, heading);
    const vector = force.frame === 'body' ? turned(force.force, heading) : force.force;
    const tip = anchor.map(
      (v, axis) => v + (vector[axis] * ARROW_UM_PER_MICRONEWTON) / UM_PER_MM
    ) as [number, number, number];
    const length = Math.hypot(...vector) * ARROW_UM_PER_MICRONEWTON;
    const dots = Math.max(2, Math.round(length / SHAFT_DOT_UM));
    const shaft = Array.from({ length: dots }, (_, i) =>
      anchor.map((v, axis) => v + ((tip[axis] - v) * i) / dots)
    ) as [number, number, number][];
    groups.push({
      id: overlayIds.forceShaft(force.name),
      name: force.name,
      color: FORCE_SHAFT_COLOR,
      coordinates: points(shaft),
      interactive: false,
    });
    groups.push({
      id: overlayIds.force(force.name),
      name: force.name,
      color: FORCE_COLOR,
      coordinates: points([tip]),
      origin: um(tip),
      interactive: !force.swept,
    });
  }
  return groups;
}

/** The body as the viewer draws it: the trunk standing, and every leg segment on its own. */
export interface IBodyAssets {
  trunk: ArrayBuffer;
  legs: ArrayBuffer;
  kinematics: IBodyKinematics;
  segments: TBodySegments;
}

/** Each leg mesh's leg, by mesh index. */
export function legOfMesh(kinematics: IBodyKinematics): Map<number, string> {
  const legs = new Map<number, string>();
  for (const [leg, { bodies }] of Object.entries(kinematics.legs)) {
    for (const body of bodies) for (const geom of body.geoms) legs.set(geom.mesh, leg);
  }
  return legs;
}

export function columnMajorOf(matrix: TMatrix): Matrix16 {
  const out: number[] = [];
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out.push(matrix[r * 4 + c]);
  return out as Matrix16;
}

function flatOf(rows: Rows): TMatrix {
  return rows.flat();
}

function flatMultiply(a: TMatrix, b: TMatrix): TMatrix {
  const out = new Array<number>(16).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      for (let k = 0; k < 4; k++) out[r * 4 + c] += a[r * 4 + k] * b[k * 4 + c];
    }
  }
  return out;
}

/** Where the circuit stands in the body: its µm into body mm, by rows of a flat matrix. */
export function cellsInBody(bodyInterface: IBodyInterface): TMatrix {
  return flatOf(bodyInterface.placement ?? BANC_IN_BODY);
}

/** The fly standing at the origin turned to `heading`: body mm into the arena's µm. */
function flyPlacement(heading: number): TMatrix {
  return flatOf(multiply(placed(heading), scaling(UM_PER_MM)));
}

export interface IBodyTracks {
  trunk: Float32Array;
  legs: Map<number, Float32Array>;
  cells: Float32Array;
}

/**
 * A preview as the viewer plays it: per frame, the trunk's and each leg mesh's transform, and
 * where the somas stand, all column-major into the arena's µm.
 */
export function previewTracks(
  preview: IBodyPreview,
  heading: number,
  bodyInterface: IBodyInterface
): IBodyTracks {
  const frames = preview.fly.length;
  const start = flyPlacement(heading);
  const placement = cellsInBody(bodyInterface);
  const trunk = new Float32Array(frames * 16);
  const cells = new Float32Array(frames * 16);
  const legs = new Map<number, Float32Array>();
  for (const mesh of preview.legs[0]?.keys() ?? []) legs.set(mesh, new Float32Array(frames * 16));
  preview.fly.forEach((motion, frame) => {
    // The rigid motion is in mm: its translation, in the viewer's µm.
    const moved = motion.map((v, i) => (i % 4 === 3 && i < 12 ? v * UM_PER_MM : v));
    const body = flatMultiply(moved, start);
    trunk.set(columnMajorOf(body), frame * 16);
    cells.set(columnMajorOf(flatMultiply(body, placement)), frame * 16);
    for (const [mesh, pose] of preview.legs[frame]) {
      legs.get(mesh)?.set(columnMajorOf(flatMultiply(body, pose)), frame * 16);
    }
  });
  return { trunk, legs, cells };
}

/**
 * The body: the trunk standing and each leg segment where `legPoses` puts it (body mm), placed as
 * the fly stands, or following `tracks` while a preview plays. A leg an override takes is drawn in
 * its own colour, so the experiment reads off the fly.
 */
export function bodyMeshes({
  assets,
  heading,
  legPoses,
  overrides,
  dark,
  visible,
  tracks,
}: {
  assets: IBodyAssets;
  heading: number;
  legPoses: Map<number, TMatrix>;
  overrides: ILegOverride[];
  dark: boolean;
  visible: boolean;
  tracks?: IBodyTracks | null;
}): MorphoViewerWorldMesh[] {
  const overridden = new Set(overrides.map((override) => LEG_BY_NAME[override.leg]));
  const legs = legOfMesh(assets.kinematics);
  const placement = flyPlacement(heading);
  const color = dark ? '#ffd29a' : '#7a4a1f';
  const highlight = dark ? '#f472b6' : '#be185d';
  const common = {
    opacity: 0.6,
    style: 'ghost' as const,
    visible,
    fit: true,
    // A click on the fly zooms onto its nervous system.
    clickFramesCells: true,
  };
  const meshes: MorphoViewerWorldMesh[] = [
    {
      ...common,
      id: 'neuromechfly:body:trunk',
      glb: assets.trunk,
      color,
      matrix: columnMajorOf(placement),
      track: tracks?.trunk,
    },
  ];
  for (const [mesh, pose] of legPoses) {
    const highlighted = overridden.has(legs.get(mesh) as never);
    meshes.push({
      ...common,
      id: `neuromechfly:body:leg:${mesh}`,
      glb: assets.legs,
      meshIndex: mesh,
      color: highlighted ? highlight : color,
      opacity: highlighted ? 0.95 : 0.6,
      matrix: columnMajorOf(flatMultiply(placement, pose)),
      track: tracks?.legs.get(mesh),
    });
  }
  return meshes;
}
