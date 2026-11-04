/**
 * Draws boxes of a field through the cells: each has its own size, colour and opacity, is drawn over what is nearer the
 * eye, and is blended over what is behind it. A box with no opacity draws nothing. Unlike the dots of `electrodes.ts`,
 * a box has its size in µm whatever the zoom, and only the faces towards the eye are drawn, so that a box counts once.
 */

import * as THREE from 'three';

import { growRound } from './electrodes';

import type { Vec3, VoxelLayer } from '../types';

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

/** Grows `box` round the layer's boxes, with `centre` taken off where they are. */
export function growRoundVoxels(
  box: THREE.Box3,
  { centres, sizes }: VoxelLayer,
  centre: Vec3
): void {
  for (let i = 0; i < centres.length; i += 3) {
    growRound(
      box,
      centres[i] - centre[0],
      centres[i + 1] - centre[1],
      centres[i + 2] - centre[2],
      sizes[i] / 2,
      sizes[i + 1] / 2,
      sizes[i + 2] / 2
    );
  }
}

/** Writes values into `attribute`, to be uploaded only if one differs. Says whether one did. */
function writeChanged(
  attribute: THREE.BufferAttribute,
  length: number,
  valueAt: (i: number) => number
): boolean {
  const array = attribute.array as Float32Array;
  let changed = false;
  for (let i = 0; i < length; i++) {
    const value = Math.fround(valueAt(i));
    if (array[i] === value) continue;
    array[i] = value;
    changed = true;
  }
  if (changed) attribute.needsUpdate = true;
  return changed;
}

/** Writes the layer's boxes into `geometry`, with `centre` taken off where they are. Says whether that changed it. */
export function writeVoxels(
  { centres, sizes, looks }: VoxelLayer,
  centre: Vec3,
  geometry: THREE.InstancedBufferGeometry
): boolean {
  const attribute = (name: string) => geometry.getAttribute(name) as THREE.BufferAttribute;
  const placed = writeChanged(
    attribute('aCentre'),
    centres.length,
    (i) => centres[i] - centre[i % 3]
  );
  const sized = writeChanged(attribute('aSize'), sizes.length, (i) => sizes[i]);
  const looked = writeChanged(attribute('aLook'), looks.length, (i) => looks[i]);
  return placed || sized || looked;
}
