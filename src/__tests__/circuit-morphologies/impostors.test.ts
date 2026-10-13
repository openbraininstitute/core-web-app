// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  impostor,
  impostorUniforms,
} from '@/features/circuit-viewer/morphologies/engine/impostors';
import { createLooks } from '@/features/viewer-3d/engine/looks';

import { compile, redeclared } from '../viewer-3d/compile';

import type * as THREE from 'three';

const KINDS = [
  { kind: 'segment', attribute: 'in vec4 aA;' },
  { kind: 'soma', attribute: 'in vec4 aSoma;' },
] as const;

const uniforms = impostorUniforms();
// The look of a surface with colours alone, as the circuit viewer asks for it.
const studio = () => createLooks(1, ['color'], ['studio'])[0].material;

beforeAll(() => {
  // The matcaps are drawn on a 2D canvas; a stub is enough to build them.
  const context = { createRadialGradient: () => ({ addColorStop() {} }), fillRect() {} };
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('impostors on the Studio look', () => {
  // A string replace whose anchor is gone does nothing: each must have found its place in three's shaders.
  it.each(KINDS)("places the $kind's quad where the vertex would go", ({ kind, attribute }) => {
    const { vertexShader } = compile(impostor(studio(), kind, uniforms));
    expect(vertexShader).toContain(attribute);
    expect(vertexShader).toContain('bool impostorCorner( vec3 corner, float shown, out vec3 P )');
    expect(vertexShader).toContain(
      'bool cornerOn = impostorCorner( position, cell.a, cornerView );'
    );
    expect(vertexShader).toContain(
      'vec3 transformed = cornerOn ? viewToWorld( cornerView ) : vec3( 0.0 );'
    );
    for (const chunk of ['color_vertex', 'beginnormal_vertex', 'begin_vertex']) {
      expect(vertexShader, chunk).not.toContain(`#include <${chunk}>`);
    }
    // The texel is read before the corner that is hidden by it.
    expect(vertexShader.indexOf('vec4 cell = cellTexel();')).toBeLessThan(
      vertexShader.indexOf('bool cornerOn')
    );
    expect(redeclared(vertexShader)).toEqual([]);
  });

  it.each(KINDS)('shades the $kind by the normal under the pixel', ({ kind }) => {
    const { fragmentShader } = compile(impostor(studio(), kind, uniforms));
    expect(fragmentShader).toContain('vec3 impostorNormal() {');
    expect(fragmentShader).toContain(
      '#include <normal_fragment_begin>\n\tnormal = impostorNormal();\n\tnonPerturbedNormal = normal;'
    );
    expect(redeclared(fragmentShader)).toEqual([]);
  });

  it("takes a cell's colour from its texel, 2,048 to a row, where the vertex colour would go", () => {
    const material = impostor(studio(), 'segment', uniforms);
    expect((material as THREE.MeshStandardMaterial).vertexColors).toBe(true);
    const { vertexShader } = compile(material);
    expect(vertexShader).toContain('ivec2( int( aCell & 2047u ), int( aCell >> 11u ) )');
    expect(vertexShader).toContain('vColor = vec4( cell.rgb, 1.0 );');
  });

  it('writes a depth of its own for a soma alone: a segment keeps the depth of its quad', () => {
    const fragment = (kind: 'segment' | 'soma') =>
      compile(impostor(studio(), kind, uniforms)).fragmentShader;
    expect(fragment('soma')).toContain('gl_FragDepth =');
    expect(fragment('segment')).not.toContain('gl_FragDepth');
  });

  it("reads the viewer's own uniforms, and keeps the size of what it is drawn into among them", () => {
    const own = impostorUniforms();
    const material = impostor(studio(), 'soma', own);
    const shader = compile(material);
    expect(shader.uniforms.uCells).toBe(own.uCells);
    expect(shader.uniforms.uViewport).toBe(own.uViewport);

    // Where the viewport starts too: gl_FragCoord counts from the frame buffer's corner, not the viewport's.
    const renderer = { getCurrentViewport: (v: THREE.Vector4) => v.set(40, 20, 2560, 1600) };
    const draw = material.onBeforeRender as unknown as (renderer: unknown) => void;
    draw.call(material, renderer);
    expect(own.uViewport.value.toArray()).toEqual([40, 20, 2560, 1600]);
    expect(shader.vertexShader).toContain(
      'uViewport.xy + ( clip.xy / clip.w * 0.5 + 0.5 ) * uViewport.zw'
    );
  });

  it("makes a segment's quad as wide as its wider end, and cuts the segment in front of the eye in perspective", () => {
    const { vertexShader } = compile(impostor(studio(), 'segment', uniforms));
    expect(vertexShader).toContain('1.15 * max( vSegmentRadii.x, vSegmentRadii.y )');
    expect(vertexShader).toContain('if ( min( a.z, b.z ) > cut ) return false;');
    expect(vertexShader).toContain('a = mix( b, a, t );');
    expect(vertexShader).toContain('b = mix( a, b, t );');
  });

  it("makes a soma's quad as wide as the sphere is seen in perspective", () => {
    const { vertexShader } = compile(impostor(studio(), 'soma', uniforms));
    expect(vertexShader).toContain('reach = r * d2 / lean;');
    expect(vertexShader).toContain('corner.xy * ( 1.2 * reach )');
  });

  it('would be told of a global brought twice, whatever its qualifiers', () => {
    const { vertexShader } = compile(impostor(studio(), 'segment', uniforms));
    const twice = `${vertexShader}\nin uint aCell;\nflat out vec2 vSegmentA;\nuniform highp sampler2D uCells;`;
    expect(redeclared(twice)).toEqual(['aCell', 'vSegmentA', 'uCells']);
  });

  it('keys the programs of the two kinds apart', () => {
    const segment = impostor(studio(), 'segment', uniforms).customProgramCacheKey();
    const soma = impostor(studio(), 'soma', uniforms).customProgramCacheKey();
    expect(segment).toContain('impostor-segment');
    expect(soma).toContain('impostor-soma');
    expect(segment).not.toBe(soma);
  });
});
