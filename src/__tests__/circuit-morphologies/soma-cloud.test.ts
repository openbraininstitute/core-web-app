// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { impostorUniforms } from '@/features/circuit-viewer/morphologies/engine/impostors';
import {
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
  it('shares the cell table, the glow and the highlight with the impostors', () => {
    for (const name of ['uCells', 'uGlow', 'uHighlighted', 'uHighlight'] as const) {
      expect(cloud.uniforms[name]).toBe(shared[name]);
    }
    expect(cloud.uniforms.uShade).toBe(own.uShade);
    expect(ids.uniforms.uCells).toBe(shared.uCells);
    expect(ids.uniforms.uRadius).toBe(own.uRadius);
  });

  it("places a quad a cell, by the instance's number, at its position less the view's origin", () => {
    for (const { vertexShader } of [cloud, ids]) {
      expect(vertexShader).toContain('return uint( gl_InstanceID );');
      expect(vertexShader).toContain('ivec2( int( cell & 2047u ), int( cell >> 11u ) )');
      expect(vertexShader).toContain('modelViewMatrix * vec4( aPosition - uOffset, 1.0 )');
      // A cell that is not drawn has its quad out of view, and in no pick.
      expect(vertexShader).toContain('gl_Position = NOWHERE;');
      expect(redeclared(vertexShader)).toEqual([]);
    }
  });

  it('writes no depth of its own: the quad keeps the depth of the soma’s centre', () => {
    expect(cloud.fragmentShader).not.toContain('gl_FragDepth');
    expect(cloud.vertexShader).toContain('centre.z, 1.0 )');
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

  it('picks with the same quads in their cells’ numbers, round as they are drawn, unblended', () => {
    expect(ids.blending).toBe(THREE.NoBlending);
    expect(ids.vertexShader).toContain('uint id = cell + 1u;');
    expect(ids.fragmentShader).toContain('if ( dot( vCoord, vCoord ) > 1.0 ) discard;');
  });
});
