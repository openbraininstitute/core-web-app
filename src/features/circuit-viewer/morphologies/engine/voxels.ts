/**
 * Draws boxes of a field through the cells: each has its own size, colour and opacity, is drawn over what is nearer the
 * eye, and is blended over what is behind it. A box with no opacity draws nothing. Unlike the dots of `electrodes.ts`,
 * a box has its size in µm whatever the zoom, and only the faces towards the eye are drawn, so that a box counts once.
 */

import * as THREE from 'three';

import { lowerBound } from '@/utils/sorted';

import { growRound } from './electrodes';

import type { Vec3, VoxelFrame, VoxelLayer } from '../types';

const IDENTITY_FRAME: VoxelFrame = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
/** Below this opacity a box is left out rather than drawn too faint to see. */
export const LEAST_OPACITY = 0.004;
/** The faces are shaded from this direction, so that a box reads as one: from this much light to all of it. */
export const SHADED_FROM = [0.35, 0.85, 0.4] as const;
export const SHADE_LEAST = 0.78;

const VERTEX = /* glsl */ `
in vec3 aCentre;
in vec3 aSize;
in vec4 aLook;
out vec4 vLook;
void main() {
	float shade = ${SHADE_LEAST.toFixed(3)} + ${(1 - SHADE_LEAST).toFixed(3)} * max( dot( normal, vec3( ${SHADED_FROM.join(', ')} ) ), 0.0 );
	vLook = vec4( aLook.rgb * shade, aLook.a );
	vec3 place = aCentre + position * aSize * step( ${LEAST_OPACITY.toFixed(3)}, aLook.a );
	gl_Position = projectionMatrix * modelViewMatrix * vec4( place, 1.0 );
}
`;

// The colours as they came, in sRGB: no tone mapping and no conversion.
const FRAGMENT = /* glsl */ `
in vec4 vLook;

void main() {
	gl_FragColor = vLook;
}
`;

/**
 * Blending set out in full on `material`: three blends a material marked transparent only after every opaque one,
 * whatever its order, and the contacts are to be drawn over these boxes.
 */
export function blendOver(material: THREE.Material): void {
  material.blending = THREE.CustomBlending;
  material.blendEquation = THREE.AddEquation;
  material.blendSrc = THREE.SrcAlphaFactor;
  material.blendDst = THREE.OneMinusSrcAlphaFactor;
  material.blendSrcAlpha = THREE.OneFactor;
  material.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  material.depthTest = false;
  material.depthWrite = false;
}

export function voxelMaterial(): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT });
  blendOver(material);
  return material;
}

/** One box, `instances` times; the shaders place each by the attributes `writeVoxels` fills. */
export function voxelGeometry(instances: number): THREE.InstancedBufferGeometry {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', box.getAttribute('position'));
  geometry.setAttribute('normal', box.getAttribute('normal'));
  geometry.setIndex(box.getIndex());
  geometry.instanceCount = instances;
  geometry
    .setAttribute('aCentre', new THREE.InstancedBufferAttribute(new Float32Array(3 * instances), 3))
    .setAttribute('aSize', new THREE.InstancedBufferAttribute(new Float32Array(3 * instances), 3))
    .setAttribute('aLook', new THREE.InstancedBufferAttribute(new Float32Array(4 * instances), 4));
  return geometry;
}

/** A place in the circuit's frame, in the frame of a layer. */
export function inVoxelFrame(point: Vec3, frame: VoxelLayer['frame']): Vec3 {
  if (!frame) return point;
  const along = ([x, y, z]: Vec3) => point[0] * x + point[1] * y + point[2] * z;
  return [along(frame[0]), along(frame[1]), along(frame[2])];
}

/** Turns the mesh of a layer from the circuit's frame to its own. */
export function turnToVoxelFrame(mesh: THREE.Object3D, frame: VoxelLayer['frame']): void {
  if (!frame) {
    mesh.quaternion.identity();
    return;
  }
  const [x, y, z] = frame.map((axis) => new THREE.Vector3(...axis));
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/** Grows `box` round the layer's boxes, with `centre` taken off where they are, however they are turned. */
export function growRoundVoxels(
  box: THREE.Box3,
  { centres, sizes, frame }: VoxelLayer,
  centre: Vec3
): void {
  const [xAxis, yAxis, zAxis] = frame ?? IDENTITY_FRAME;
  const inCircuit = (a: number, b: number, c: number, part: number) =>
    a * xAxis[part] + b * yAxis[part] + c * zAxis[part];
  const reach = (a: number, b: number, c: number, part: number) =>
    (Math.abs(xAxis[part]) * a + Math.abs(yAxis[part]) * b + Math.abs(zAxis[part]) * c) / 2;
  for (let i = 0; i < centres.length; i += 3) {
    const [cx, cy, cz] = [centres[i], centres[i + 1], centres[i + 2]];
    const [sx, sy, sz] = [sizes[i], sizes[i + 1], sizes[i + 2]];
    growRound(
      box,
      inCircuit(cx, cy, cz, 0) - centre[0],
      inCircuit(cx, cy, cz, 1) - centre[1],
      inCircuit(cx, cy, cz, 2) - centre[2],
      reach(sx, sy, sz, 0),
      reach(sx, sy, sz, 1),
      reach(sx, sy, sz, 2)
    );
  }
}

/**
 * Visits `count` groups, ascending along an axis, far to near from an eye there: those on either side of it from the
 * outside in, then the one it is at. A group's side is told by the middle of the gap to the next, not by its centre, as
 * an eye past the centre of a box is still on that box's side of the gap.
 */
function farToNear(
  count: number,
  placeOf: (group: number) => number,
  eye: number,
  visit: (group: number) => void
): void {
  if (count === 0) return;
  let nearest = 0;
  while (nearest + 1 < count && (placeOf(nearest) + placeOf(nearest + 1)) / 2 < eye) nearest++;
  for (let group = 0; group < nearest; group++) visit(group);
  for (let group = count - 1; group > nearest; group--) visit(group);
  visit(nearest);
}

/**
 * The order to blend a layer's boxes in, far to near. Boxes that do not overlap are separated by a gap along some axis,
 * and the one on the eye's side of it goes later, so this holds whatever their shape, unlike their centres' depth, and
 * changes only as the eye crosses a gap. Walking the lattice takes no sort.
 */
export class VoxelOrder {
  /** The box to draw at each place. */
  readonly boxes: Uint32Array;
  private readonly lattice: VoxelLayer['lattice'];
  private readonly centres: Float32Array;
  /** Per level of the lattice, the middles of all its gaps, ascending. */
  private readonly gaps: Float64Array[];
  private readonly crossed = [-1, -1, -1];

  constructor({ centres, lattice }: Pick<VoxelLayer, 'centres' | 'lattice'>) {
    this.centres = centres;
    this.lattice = lattice;
    this.boxes = new Uint32Array(centres.length / 3);
    this.gaps = this.gapsOf();
  }

  private placeOf(box: number, level: number): number {
    return this.centres[box * 3 + this.lattice.axes[level]];
  }

  private gapsOf(): Float64Array[] {
    const { planes, rows } = this.lattice;
    const gaps: number[][] = [[], [], []];
    const between = (level: number, a: number, b: number) =>
      gaps[level].push((this.placeOf(a, level) + this.placeOf(b, level)) / 2);
    for (let plane = 0; plane + 1 < planes.length; plane++) {
      if (plane + 2 < planes.length) between(0, rows[planes[plane]], rows[planes[plane + 1]]);
      for (let row = planes[plane]; row + 1 < planes[plane + 1]; row++) {
        between(1, rows[row], rows[row + 1]);
      }
    }
    for (let row = 0; row + 1 < rows.length; row++) {
      for (let box = rows[row]; box + 1 < rows[row + 1]; box++) between(2, box, box + 1);
    }
    return gaps.map((middles) => Float64Array.from(middles).sort());
  }

  /** Orders the boxes for an eye there, in their frame. Says whether that may have changed the order. */
  seenFrom(eye: Vec3): boolean {
    const { axes } = this.lattice;
    let same = true;
    for (let level = 0; level < 3; level++) {
      const crossed = lowerBound(this.gaps[level], eye[axes[level]]);
      if (crossed !== this.crossed[level]) same = false;
      this.crossed[level] = crossed;
    }
    if (same) return false;
    this.walk(eye);
    return true;
  }

  private walk(eye: Vec3): void {
    const { axes, planes, rows } = this.lattice;
    let place = 0;
    farToNear(
      planes.length - 1,
      (plane) => this.placeOf(rows[planes[plane]], 0),
      eye[axes[0]],
      (plane) => {
        const firstRow = planes[plane];
        farToNear(
          planes[plane + 1] - firstRow,
          (row) => this.placeOf(rows[firstRow + row], 1),
          eye[axes[1]],
          (row) => {
            const first = rows[firstRow + row];
            farToNear(
              rows[firstRow + row + 1] - first,
              (box) => this.placeOf(first + box, 2),
              eye[axes[2]],
              (box) => {
                this.boxes[place++] = first + box;
              }
            );
          }
        );
      }
    );
  }
}

/** Writes values into `attribute`, to be uploaded only if one differs. Says whether one did. */
function writeChanged(
  attribute: THREE.BufferAttribute,
  order: Uint32Array,
  stride: number,
  valueAt: (box: number, part: number) => number
): boolean {
  const array = attribute.array as Float32Array;
  let changed = false;
  for (let place = 0; place < order.length; place++) {
    for (let part = 0; part < stride; part++) {
      const value = Math.fround(valueAt(order[place], part));
      const i = place * stride + part;
      if (array[i] === value) continue;
      array[i] = value;
      changed = true;
    }
  }
  if (changed) attribute.needsUpdate = true;
  return changed;
}

/**
 * Writes the layer's boxes into `geometry` in the given order, with `centre`, in the circuit's frame, taken off where
 * they are. Says whether that changed it.
 */
export function writeVoxels(
  { centres, sizes, looks, frame }: VoxelLayer,
  centre: Vec3,
  order: Uint32Array,
  geometry: THREE.InstancedBufferGeometry
): boolean {
  const attribute = (name: string) => geometry.getAttribute(name) as THREE.BufferAttribute;
  const framed = inVoxelFrame(centre, frame);
  const placed = writeChanged(
    attribute('aCentre'),
    order,
    3,
    (box, part) => centres[box * 3 + part] - framed[part]
  );
  const sized = writeChanged(attribute('aSize'), order, 3, (box, part) => sizes[box * 3 + part]);
  const looked = writeChanged(attribute('aLook'), order, 4, (box, part) => looks[box * 4 + part]);
  return placed || sized || looked;
}
