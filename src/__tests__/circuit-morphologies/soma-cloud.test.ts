// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { impostorUniforms } from '@/features/circuit-viewer/morphologies/engine/impostors';
import {
  cloudPieces,
  fanGeometry,
  somaCloudIdMaterial,
  somaCloudMaterial,
  somaCloudUniforms,
} from '@/features/circuit-viewer/morphologies/engine/soma-cloud';

import { redeclared } from '../viewer-3d/compile';

const shared = impostorUniforms();
const own = somaCloudUniforms();
const cloud = somaCloudMaterial(shared, own);
const ids = somaCloudIdMaterial(shared, own);

describe('the somas drawn as the somas view drew them', () => {
  it('shares the cell table, the glow, the highlight and the ring with the impostors', () => {
    for (const name of ['uCells', 'uGlow', 'uHighlighted', 'uHighlight', 'uGlowRim'] as const) {
      expect(cloud.uniforms[name]).toBe(shared[name]);
    }
    expect(cloud.uniforms.uShade).toBe(own.uShade);
    expect(ids.uniforms.uCells).toBe(shared.uCells);
    expect(ids.uniforms.uRadius).toBe(own.uRadius);
  });

  it("places a pyramid a cell, by the cell it is given, at its position less the view's origin", () => {
    for (const { vertexShader } of [cloud, ids]) {
      expect(vertexShader).toContain('in uint aCell;');
      expect(vertexShader).toContain('return aCell;');
      expect(vertexShader).toContain('ivec2( int( cell & 2047u ), int( cell >> 11u ) )');
      expect(vertexShader).toContain('modelViewMatrix * vec4( aPosition - uOffset, 1.0 )');
      // A cell that is not drawn has its pyramid out of view, and in no pick.
      expect(vertexShader).toContain('gl_Position = NOWHERE;');
      expect(redeclared(vertexShader)).toEqual([]);
    }
  });

  it('draws a pyramid a cell, its tip a radius nearer over its centre, and writes no depth of its own', () => {
    const corners = fanGeometry(5).getAttribute('position');
    const reach = 1 / Math.cos(Math.PI / 6);
    expect([corners.getX(0), corners.getY(0), corners.getZ(0)]).toEqual([0, 0, 1]);
    for (let k = 1; k < corners.count; k++) {
      expect(Math.hypot(corners.getX(k), corners.getY(k))).toBeCloseTo(reach);
      expect(corners.getZ(k)).toBe(0);
    }
    for (const { vertexShader, fragmentShader } of [cloud, ids]) {
      expect(vertexShader).toContain(
        'lifted( vec3( centre.xy + position.xy * radius, centre.z ), position.z * radius )'
      );
      expect(fragmentShader).not.toContain('gl_FragDepth');
    }
  });

  // The tip is nearer than the base: interpolated as three does, the disc would bend.
  it('runs the disc’s coordinate straight across the screen', () => {
    for (const { vertexShader, fragmentShader } of [cloud, ids]) {
      expect(vertexShader).toContain('return vec3( position.xy * clip.w, clip.w );');
      expect(vertexShader).toContain('vCoord = discCoord( gl_Position );');
      expect(fragmentShader).toContain('vec2 coord = vCoord.xy / vCoord.z;');
    }
  });

  it('turns each pyramid to face the eye, its triangles about its tip', () => {
    const geometry = fanGeometry(5);
    const corners = geometry.getAttribute('position');
    const triangles = geometry.getIndex()?.array ?? [];
    expect(geometry.instanceCount).toBe(5);
    expect(triangles).toHaveLength(18);
    for (let t = 0; t < triangles.length; t += 3) {
      const [a, b, c] = [triangles[t], triangles[t + 1], triangles[t + 2]];
      expect(a).toBe(0);
      const turn =
        (corners.getX(b) - corners.getX(a)) * (corners.getY(c) - corners.getY(a)) -
        (corners.getY(b) - corners.getY(a)) * (corners.getX(c) - corners.getX(a));
      expect(turn).toBeGreaterThan(0);
    }
  });

  it("darkens a cell's colour by up to 55% as it is crowded, and runs one with none of its own along a blue ramp", () => {
    const { vertexShader } = cloud;
    expect(vertexShader).toContain(
      'if ( shade.g < 0.5 ) return colour * ( 1.0 - 0.55 * shade.r );'
    );
    // #99ddff, #00aaff and #003399, in sRGB.
    expect(vertexShader).toContain('vec3( 0.600000, 0.866667, 1.000000 )');
    expect(vertexShader).toContain('vec3( 0.000000, 0.666667, 1.000000 )');
    expect(vertexShader).toContain('vec3( 0.000000, 0.200000, 0.600000 )');
  });

  it("shades the sphere by tgd's fixed light, in sRGB, with nothing tone mapped", () => {
    const light = new THREE.Vector3(-0.4, 0.5, 0.666).normalize();
    expect(cloud.fragmentShader).toContain(
      `vec3( ${light
        .toArray()
        .map((v) => v.toFixed(6))
        .join(', ')} )`
    );
    expect(cloud.fragmentShader).toContain('0.33 * pow( facing, 50.0 )');
    expect(cloud.fragmentShader).not.toContain('tonemapping');
    expect(cloud.fragmentShader).not.toContain('colorspace');
  });

  it('swells a spiking soma, makes it opaque, and draws the highlighted cell in the highlight colour', () => {
    expect(cloud.vertexShader).toContain('cornerAt( uRadius * ( 1.0 + 0.700000 * glow ) )');
    expect(cloud.vertexShader).toContain('vAlpha = lit ? 1.0 : mix( uOpacity, 1.0, glow );');
    expect(cloud.vertexShader).toContain('bool lit = cell == uHighlighted;');
  });

  // On a dark background the impostors have none, so a spike looks the same on the somas and on the morphologies.
  it('rings a spiking soma only as far as the impostors ring their cells', () => {
    expect(cloud.fragmentShader).toContain(
      'float rim = vGlow * uGlowRim.a * smoothstep( 0.9, 1.0, length( coord ) );'
    );
  });

  it('picks with the same pyramids in their cells’ numbers, round as they are drawn, unblended', () => {
    expect(ids.blending).toBe(THREE.NoBlending);
    expect(ids.vertexShader).toContain('uint id = cell + 1u;');
    expect(ids.fragmentShader).toContain('if ( dot( coord, coord ) > 1.0 ) discard;');
  });
});

describe('the cloud cut into pieces', () => {
  it('orders the somas by place, each with its cell, a sphere round them, and none with no place in it', () => {
    const positions = Float32Array.of(10, 10, 10, 0, 0, 0, Number.NaN, 0, 0, 10, 0, 0, 0, 10, 0);
    const [piece, ...more] = cloudPieces(positions);
    expect(more).toEqual([]);
    expect([...piece.cells]).toEqual([1, 2, 3, 4, 0]);
    piece.cells.forEach((cell, i) => {
      expect([...piece.positions.subarray(3 * i, 3 * i + 3)]).toEqual([
        ...positions.subarray(3 * cell, 3 * cell + 3),
      ]);
    });
    expect(piece.centre.toArray()).toEqual([5, 5, 5]);
    expect(piece.reach).toBeCloseTo(5 * Math.sqrt(3));
  });

  it('cuts the cloud by place: neighbours in a piece, whatever their order in the page', () => {
    // Every other cell in one of two corners far apart.
    const n = 2 * 32768;
    const positions = new Float32Array(3 * n);
    for (let cell = 0; cell < n; cell++)
      positions.fill((cell % 2) * 1000 + (cell % 7), 3 * cell, 3 * cell + 3);
    const pieces = cloudPieces(positions);
    expect(pieces).toHaveLength(2);
    for (const { cells } of pieces)
      expect(new Set(Array.from(cells, (cell) => cell % 2)).size).toBe(1);
  });

  it('cuts the cloud into pieces of 32,768 neighbours', () => {
    const sizes = (n: number) => cloudPieces(new Float32Array(3 * n)).map((p) => p.cells.length);
    expect(sizes(70000)).toEqual([32768, 32768, 4464]);
    expect(sizes(1)).toEqual([1]);
    expect(sizes(0)).toEqual([]);
  });
});
