/**
 * Draws boxes of a field through the cells: each has its own size, colour and opacity, is drawn over what is nearer the
 * eye, and is blended over what is behind it. A box with no opacity draws nothing. Unlike the dots of `electrodes.ts`,
 * a box has its size in µm whatever the zoom, and only the faces towards the eye are drawn, so that a box counts once.
 */

import * as THREE from 'three';

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

/** Writes the layer's boxes into `geometry`, with `centre` taken off where they are. */
export function writeVoxels(
  { centres, sizes, looks }: VoxelLayer,
  centre: Vec3,
  geometry: THREE.InstancedBufferGeometry
): void {
  const placed = geometry.getAttribute('aCentre') as THREE.InstancedBufferAttribute;
  const sized = geometry.getAttribute('aSize') as THREE.InstancedBufferAttribute;
  const looked = geometry.getAttribute('aLook') as THREE.InstancedBufferAttribute;
  for (let i = 0; i < centres.length; i++) placed.array[i] = centres[i] - centre[i % 3];
  (sized.array as Float32Array).set(sizes);
  (looked.array as Float32Array).set(looks);
  placed.needsUpdate = true;
  sized.needsUpdate = true;
  looked.needsUpdate = true;
}
