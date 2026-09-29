import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

import { addShaderHook } from './looks';

import type { SkeletonKind } from './viewer';

type LineParameters = ConstructorParameters<typeof LineMaterial>[0];

/** Which skeleton shows, and which materials draw it. */
export interface SkeletonStyle {
  kind: SkeletonKind | null;
  /** As wide as its fibres (`standInMaterial`). */
  body: boolean;
  /** A line (`overlayMaterial`), and the dark casing around it. */
  line: boolean;
  casing: boolean;
}

/**
 * Until the mesh comes, or where it could not be built, the traced skeleton stands in for it, drawn as wide as its
 * fibres. Over the mesh, the chosen skeleton is a line in a casing; with the mesh turned off, the line alone.
 */
export function skeletonStyle(
  chosen: SkeletonKind | null,
  hasMesh: boolean,
  meshVisible: boolean
): SkeletonStyle {
  const standIn = !hasMesh && meshVisible;
  return {
    kind: hasMesh ? chosen : 'original',
    body: standIn,
    line: !standIn,
    casing: hasMesh && meshVisible,
  };
}

/** `from` replaced in three's line shader, with a warning where an update of three has reworded it. */
function patch(source: string, from: string, to: string): string {
  if (!source.includes(from))
    console.warn(`three's LineMaterial has changed: no "${from}" to patch`);
  return source.replace(from, to);
}

/**
 * three's fat lines, without the segments of no length: the soma's, which only the stand-in draws, and on which
 * three's direction would be NaN.
 */
export function overlayMaterial(parameters: LineParameters): LineMaterial {
  return addShaderHook(new LineMaterial(parameters), 'skeleton-overlay', (shader) => {
    shader.vertexShader = patch(
      shader.vertexShader,
      'void main() {',
      'void main() {\n\tif ( instanceStart == instanceEnd ) { gl_Position = vec4( 0.0 ); return; }'
    );
  });
}

/**
 * The skeleton standing in for the mesh: each end of a segment as wide as its fibre at its depth (`instanceRadius`),
 * as the mesh draws it, and at least `linewidth` CSS pixels, the mesh's width floor. A fibre of radius r is
 * r P[1][1] H / w pixels wide, H the viewport's height and w the clip w. A segment of no length, the soma's, is a disc.
 */
export function standInMaterial(parameters: LineParameters): LineMaterial {
  return addShaderHook(new LineMaterial(parameters), 'skeleton-stand-in', (shader) => {
    let v = patch(
      shader.vertexShader,
      '#include <common>',
      '#include <common>\nattribute vec2 instanceRadius;'
    );
    v = patch(
      v,
      'dir = normalize( dir );',
      'dir = dot( dir, dir ) > 0.0 ? normalize( dir ) : vec2( 1.0, 0.0 );'
    );
    shader.vertexShader = patch(
      v,
      'offset *= linewidth;',
      `float fibre = position.y < 0.5 ? instanceRadius.x / clipStart.w : instanceRadius.y / clipEnd.w;
				offset *= max( linewidth, fibre * projectionMatrix[ 1 ][ 1 ] * resolution.y );`
    );
  });
}
