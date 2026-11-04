import { positionOfLevel, rgbAt, SCENE_LEVELS } from '@/features/lfp-viewer/colour-scale';
import { median } from '@/features/viewer-3d/engine/motion-quality';

import type {
  Vec3,
  VoxelFrame,
  VoxelLattice,
  VoxelLayer,
} from '@/features/circuit-viewer/morphologies/types';

type Triple<T> = [T, T, T];

/** Contacts this close along an axis, in µm, are in one plane. */
const PLANE_TOLERANCE_UM = 1;
/** Slices a grid has at least along two axes: fewer is a probe. */
const MIN_SLICES = 5;
/** The share of a plane's contacts that have a neighbour along its rows, in a grid. */
const MIN_IN_ROWS = 0.5;
/** How much of its step a voxel fills, so that those next to it stand apart. */
const VOXEL_FILL = 0.85;
/** How opaque a voxel at the scale's limit is, and how fast that falls towards zero, so that the quiet ones clear. */
const VOXEL_OPACITY = 0.55;
const VOXEL_OPACITY_POWER = 1.6;
/** How much of its step a slice's tile fills, across the slice and through it. */
const TILE_FILL = 0.98;
const TILE_THICKNESS = 0.12;
const TILE_OPACITY = 0.95;
/** Contacts sampled for the axes of a turned lattice, and neighbours looked at from each. */
const FRAME_SAMPLES = 64;
const FRAME_NEIGHBOURS = 18;
/** Steps within 3° are along one direction, and two directions within 3° of square are at right angles. */
const SAME_DIRECTION = Math.cos((3 * Math.PI) / 180);
const AT_RIGHT_ANGLES = Math.sin((3 * Math.PI) / 180);
const CIRCUIT_AXES = ['x', 'y', 'z'];
const TURNED_AXES = ['a', 'b', 'c'];

const LEVEL_RGB = Array.from({ length: SCENE_LEVELS }, (_, level) =>
  rgbAt(positionOfLevel(level)).map((channel) => channel / 255)
);
const LEVEL_OPACITY = Array.from(
  { length: SCENE_LEVELS },
  (_, level) => VOXEL_OPACITY * Math.abs(positionOfLevel(level)) ** VOXEL_OPACITY_POWER
);

export type GridSlice = { axis: number; index: number };

export type ContactGrid = {
  /** The step between voxels along x, y and z, in µm. */
  pitch: Triple<number>;
  /** Slices along x, y and z. */
  slices: Triple<number>;
  /** The axis the planes are stacked along. */
  stack: number;
  /** Where each slice along x, y and z is, in µm. Along the stack, these are its planes, however far apart. */
  places: Triple<number[]>;
  /** Per axis, the slice each contact is in. Every contact is in one, whatever its plane's offset. */
  sliceOf: Triple<Uint16Array>;
  /** How the grid is turned from the circuit's axes, or null where it lies along them. */
  frame: VoxelFrame | null;
  /** The contacts in the grid's frame, in which the rest of this is. */
  positions: Float32Array;
};

type AxisGrid = Omit<ContactGrid, 'frame' | 'positions'>;

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

function coordinates(positions: Float32Array, axis: number): Float32Array {
  return Float32Array.from({ length: positions.length / 3 }, (_, c) => positions[c * 3 + axis]);
}

/** The planes values fall in: the first of each run of values within the tolerance. */
function planesOf(values: Float32Array): number[] {
  const planes: number[] = [];
  let plane = -Infinity;
  for (const value of values.toSorted()) {
    if (value - plane > PLANE_TOLERANCE_UM) {
      plane = value;
      planes.push(value);
    }
  }
  return planes;
}

/** Contacts by the plane they are in along `values`. */
function membersOfPlanes(values: Float32Array, planes: number[]): number[][] {
  const members: number[][] = planes.map(() => []);
  values.forEach((value, contact) => {
    let plane = planes.length - 1;
    while (plane > 0 && value < planes[plane]) plane--;
    members[plane].push(contact);
  });
  return members;
}

/**
 * The steps along `along` between neighbours in a row, a row being contacts of one plane that share
 * their place along `across`: each plane has its own offset, so rows hold only within a plane.
 */
function rowSteps(
  plane: readonly number[],
  along: Float32Array,
  across: Float32Array
): { steps: number[]; inRows: number } {
  const places = Float32Array.from(plane, (contact) => across[contact]);
  const steps: number[] = [];
  let inRows = 0;
  for (const members of membersOfPlanes(places, planesOf(places))) {
    if (members.length < 2) continue;
    inRows += members.length;
    const row = members.map((member) => along[plane[member]]).sort((a, b) => a - b);
    for (let i = 1; i < row.length; i++) {
      if (row[i] - row[i - 1] > PLANE_TOLERANCE_UM) steps.push(row[i] - row[i - 1]);
    }
  }
  return { steps, inRows };
}

/**
 * The grid the contacts lie on along x, y and z, or null where they lie on none. The contacts come
 * as a stack of planes along the axis with the fewest, each plane a lattice of its own, which may be
 * offset from the next.
 */
function gridAlongAxes(positions: Float32Array): AxisGrid | null {
  const contacts = positions.length / 3;
  if (contacts === 0) return null;
  const values: Triple<Float32Array> = [
    coordinates(positions, 0),
    coordinates(positions, 1),
    coordinates(positions, 2),
  ];
  const planes = values.map(planesOf);
  const stack = [0, 1, 2].reduce((a, b) => (planes[b].length < planes[a].length ? b : a));
  if (planes[stack].length > contacts / 2) return null;
  const [u, v] = [0, 1, 2].filter((axis) => axis !== stack);

  const members = membersOfPlanes(values[stack], planes[stack]);
  const inPlane = (along: number, across: number) => {
    const steps: number[] = [];
    let inRows = 0;
    for (const plane of members) {
      const row = rowSteps(plane, values[along], values[across]);
      steps.push(...row.steps);
      inRows += row.inRows;
    }
    return { step: steps.length > 0 ? median(steps) : null, inRows };
  };
  const alongU = inPlane(u, v);
  const alongV = inPlane(v, u);
  if (alongU.step === null || alongV.step === null) return null;
  if (Math.max(alongU.inRows, alongV.inRows) < contacts * MIN_IN_ROWS) return null;

  const pitch: Triple<number> = [0, 0, 0];
  pitch[u] = alongU.step;
  pitch[v] = alongV.step;
  pitch[stack] =
    planes[stack].length > 1
      ? median(planes[stack].slice(1).map((plane, i) => plane - planes[stack][i]))
      : Math.min(alongU.step, alongV.step);

  const sliceOf = values.map((along, axis) => {
    const ofContact = new Uint16Array(contacts);
    members.forEach((plane, index) => {
      // Decided once a plane, which may lie half a step between two slices, so that its columns stay whole.
      const start = plane.reduce((least, contact) => Math.min(least, along[contact]), Infinity);
      const offset = Math.round((start - planes[axis][0]) / pitch[axis]);
      for (const contact of plane) {
        ofContact[contact] =
          axis === stack ? index : offset + Math.round((along[contact] - start) / pitch[axis]);
      }
    });
    return ofContact;
  }) as Triple<Uint16Array>;
  const slices = sliceOf.map((of) => of.reduce((most, slice) => Math.max(most, slice), 0) + 1);
  if (slices.filter((count) => count >= MIN_SLICES).length < 2) return null;
  const places = slices.map((count, axis) =>
    axis === stack
      ? planes[stack]
      : Array.from({ length: count }, (_, index) => planes[axis][0] + index * pitch[axis])
  ) as Triple<number[]>;
  return { pitch, slices: slices as Triple<number>, stack, places, sliceOf };
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v: Vec3): Vec3 => {
  const length = Math.hypot(...v);
  return [v[0] / length, v[1] / length, v[2] / length];
};

/**
 * Directions from sampled contacts to their nearest neighbours, either way along each, the most
 * telling first: a grid has the same steps at every contact, and nearer ones weigh more, so that
 * its axes outrank the diagonals of its cells.
 */
function neighbourDirections(positions: Float32Array): Vec3[] {
  const contacts = positions.length / 3;
  const directions: { seed: Vec3; sum: Vec3; weight: number }[] = [];
  const distances = new Float32Array(contacts);
  const every = Math.max(1, Math.floor(contacts / FRAME_SAMPLES));
  for (let from = 0; from < contacts; from += every) {
    const here: Vec3 = [positions[from * 3], positions[from * 3 + 1], positions[from * 3 + 2]];
    for (let to = 0; to < contacts; to++) {
      distances[to] = Math.hypot(
        positions[to * 3] - here[0],
        positions[to * 3 + 1] - here[1],
        positions[to * 3 + 2] - here[2]
      );
    }
    const reach = distances.toSorted()[Math.min(FRAME_NEIGHBOURS, contacts - 1)];
    for (let to = 0; to < contacts; to++) {
      if (distances[to] === 0 || distances[to] > reach) continue;
      const toward: Vec3 = [
        (positions[to * 3] - here[0]) / distances[to],
        (positions[to * 3 + 1] - here[1]) / distances[to],
        (positions[to * 3 + 2] - here[2]) / distances[to],
      ];
      const found = directions.find(({ seed }) => Math.abs(dot(seed, toward)) > SAME_DIRECTION);
      if (!found) {
        directions.push({ seed: toward, sum: toward, weight: 1 / distances[to] });
        continue;
      }
      const sign = Math.sign(dot(found.seed, toward));
      found.sum = [
        found.sum[0] + sign * toward[0],
        found.sum[1] + sign * toward[1],
        found.sum[2] + sign * toward[2],
      ];
      found.weight += 1 / distances[to];
    }
  }
  return directions.sort((a, b) => b.weight - a.weight).map(({ sum }) => unit(sum));
}

/**
 * The axes of a lattice however it is turned, from the steps between its contacts: its spread will
 * not do, as a cube's is the same every way. Null where no two of them are at right angles. Only a
 * guess: what lies on the frame is for `gridAlongAxes` to say.
 */
function latticeFrame(positions: Float32Array): VoxelFrame | null {
  const directions = neighbourDirections(positions);
  if (directions.length === 0) return null;
  const first = directions[0];
  const square = directions.find((other) => Math.abs(dot(first, other)) < AT_RIGHT_ANGLES);
  if (!square) return null;
  const along = dot(first, square);
  const second = unit([
    square[0] - along * first[0],
    square[1] - along * first[1],
    square[2] - along * first[2],
  ]);
  const axes = [first, second, cross(first, second)];
  // Named after the axis each is nearest to, so that the same grid always gets the same frame.
  const x = axes.reduce((a, b) => (Math.abs(b[0]) > Math.abs(a[0]) ? b : a));
  const y = axes
    .filter((axis) => axis !== x)
    .reduce((a, b) => (Math.abs(b[1]) > Math.abs(a[1]) ? b : a));
  const towards = (axis: Vec3, part: number): Vec3 =>
    axis[part] < 0 ? [-axis[0], -axis[1], -axis[2]] : axis;
  const [xAxis, yAxis] = [towards(x, 0), towards(y, 1)];
  return [xAxis, yAxis, cross(xAxis, yAxis)];
}

function intoFrame(positions: Float32Array, frame: VoxelFrame): Float32Array {
  const framed = new Float32Array(positions.length);
  for (let c = 0; c < positions.length; c += 3) {
    const point: Vec3 = [positions[c], positions[c + 1], positions[c + 2]];
    for (let axis = 0; axis < 3; axis++) framed[c + axis] = dot(point, frame[axis]);
  }
  return framed;
}

/**
 * The grid the contacts lie on, in the frame it is square in: x, y and z where it lies along them,
 * or else its own. Null where they lie on none: a probe, or scattered contacts.
 */
export function contactGrid(positions: Float32Array): ContactGrid | null {
  const alongAxes = gridAlongAxes(positions);
  if (alongAxes) return { ...alongAxes, frame: null, positions };
  const frame = latticeFrame(positions);
  if (!frame) return null;
  const framed = intoFrame(positions, frame);
  const turned = gridAlongAxes(framed);
  return turned && { ...turned, frame, positions: framed };
}

/** Where a slice of the grid is along its axis, in µm of the grid's frame. */
export function slicePosition({ places }: ContactGrid, { axis, index }: GridSlice): number {
  return places[axis][index];
}

/** What the grid's axes are called: x, y and z only where those are what they are. */
export function gridAxisNames({ frame }: ContactGrid): readonly string[] {
  return frame ? TURNED_AXES : CIRCUIT_AXES;
}

/** Where a slice is, as it can be told: µm along the circuit's axes mean nothing along a grid's own. */
export function sliceLabel(grid: ContactGrid, slice: GridSlice): string {
  if (grid.frame) return `Plane ${slice.index + 1} of ${grid.slices[slice.axis]}`;
  return `${CIRCUIT_AXES[slice.axis]} = ${slicePosition(grid, slice).toFixed(0)} µm`;
}

/** The axis with the fewest slices of those that have more than one: the stack's, as a rule. */
export function openingSliceAxis({ slices }: ContactGrid): number {
  return [0, 1, 2]
    .filter((axis) => slices[axis] > 1)
    .reduce((a, b) => (slices[b] < slices[a] ? b : a));
}

export type VoxelPlacement = Pick<VoxelLayer, 'centres' | 'sizes' | 'lattice' | 'frame'> & {
  /** The contact each box is of. */
  shown: number[];
  /** A slice's tiles, as against voxels whose opacity follows |V|. */
  tiled: boolean;
};

/** Sorts contacts into planes of rows, and says where each of those starts. */
function latticeOf(shown: number[], { stack, sliceOf }: ContactGrid): VoxelLattice {
  const [u, v] = [0, 1, 2].filter((axis) => axis !== stack);
  const [plane, row, along] = [sliceOf[stack], sliceOf[u], sliceOf[v]];
  shown.sort((a, b) => plane[a] - plane[b] || row[a] - row[b] || along[a] - along[b]);
  const planes: number[] = [];
  const rows: number[] = [];
  shown.forEach((contact, i) => {
    const before = shown[i - 1];
    const startsPlane = i === 0 || plane[contact] !== plane[before];
    if (startsPlane) planes.push(rows.length);
    if (startsPlane || row[contact] !== row[before]) rows.push(i);
  });
  planes.push(rows.length);
  rows.push(shown.length);
  return { axes: [stack, u, v], planes: Uint32Array.from(planes), rows: Uint32Array.from(rows) };
}

/**
 * Where the grid's contacts are drawn as boxes: all of them, or those of one slice as a sheet of
 * tiles, brought onto its plane.
 */
export function placeVoxels(grid: ContactGrid, slice: GridSlice | null): VoxelPlacement {
  const { positions, frame } = grid;
  const contacts = positions.length / 3;
  const shown: number[] = [];
  for (let contact = 0; contact < contacts; contact++) {
    if (!slice || grid.sliceOf[slice.axis][contact] === slice.index) shown.push(contact);
  }
  const lattice = latticeOf(shown, grid);
  const size = grid.pitch.map((step, axis) =>
    !slice ? step * VOXEL_FILL : step * (axis === slice.axis ? TILE_THICKNESS : TILE_FILL)
  );
  const centres = new Float32Array(shown.length * 3);
  const sizes = new Float32Array(shown.length * 3);
  shown.forEach((contact, i) => {
    for (let axis = 0; axis < 3; axis++) {
      centres[i * 3 + axis] = positions[contact * 3 + axis];
      sizes[i * 3 + axis] = size[axis];
    }
    if (slice) centres[i * 3 + slice.axis] = slicePosition(grid, slice);
  });
  return { shown, centres, sizes, lattice, frame, tiled: slice !== null };
}

/** Placed boxes at their contacts' colour levels: tiles opaque, voxels the more opaque the larger |V|. */
export function voxelsOf(
  { shown, centres, sizes, lattice, frame, tiled }: VoxelPlacement,
  levels: Uint8Array
): VoxelLayer {
  const looks = new Float32Array(shown.length * 4);
  shown.forEach((contact, i) => {
    const level = levels[contact];
    looks.set(LEVEL_RGB[level], i * 4);
    looks[i * 4 + 3] = tiled ? TILE_OPACITY : LEVEL_OPACITY[level];
  });
  return { centres, sizes, looks, lattice, frame };
}
