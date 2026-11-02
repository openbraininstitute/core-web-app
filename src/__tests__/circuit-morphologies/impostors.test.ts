// @vitest-environment node

import { NoBlending } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  cellNearMiddle,
  idMaterial,
  impostor,
  impostorUniforms,
  LIFTED,
  NO_CELL,
  setSectionColours,
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
    expect(vertexShader).toContain(
      'bool impostorCorner( vec3 corner, float shown, float least, out vec3 P )'
    );
    // Glowing in full, at twice the least width.
    expect(vertexShader).toContain(
      'bool cornerOn = impostorCorner( position, cell.a, MIN_RADIUS * ( 1.0 + vGlow ), cornerView );'
    );
    expect(vertexShader).toContain(
      'vec3 transformed = cornerOn ? viewToWorld( cornerView ) : vec3( 0.0 );'
    );
    for (const chunk of ['color_vertex', 'beginnormal_vertex', 'begin_vertex']) {
      expect(vertexShader, chunk).not.toContain(`#include <${chunk}>`);
    }
    // The texel and the glow are read before the corner that is hidden and widened by them.
    expect(vertexShader.indexOf('vec4 cell = cellTexel();')).toBeLessThan(
      vertexShader.indexOf('bool cornerOn')
    );
    expect(vertexShader.indexOf('vGlow = cellGlow();')).toBeLessThan(
      vertexShader.indexOf('bool cornerOn')
    );
    expect(redeclared(vertexShader)).toEqual([]);
  });

  it.each(KINDS)('shades the $kind by the normal under the pixel', ({ kind }) => {
    const { fragmentShader } = compile(impostor(studio(), kind, uniforms));
    expect(fragmentShader).toContain('vec3 impostorNormal( out vec2 edge ) {');
    expect(fragmentShader).toContain(
      '#include <normal_fragment_begin>\n\tvec2 impostorEdge;' +
        '\n\tnormal = impostorNormal( impostorEdge );\n\tnonPerturbedNormal = normal;'
    );
    expect(redeclared(fragmentShader)).toEqual([]);
  });

  it("takes a cell's colour from its texel, 2,048 to a row, where the vertex colour would go", () => {
    const material = impostor(studio(), 'segment', uniforms);
    expect((material as THREE.MeshStandardMaterial).vertexColors).toBe(true);
    const { vertexShader } = compile(material);
    expect(vertexShader).toContain('ivec2( int( cell & 2047u ), int( cell >> 11u ) )');
    expect(vertexShader).toContain('return texelFetch( uCells, cellXY( impostorCell() ), 0 );');
    expect(vertexShader).toContain('vColor = vec4( cellColour( ownColour( cell ) ), 1.0 );');
  });

  it("draws a cell a step short of opaque in its sections' colours, by each segment's type, the soma in the soma's", () => {
    const own = impostorUniforms();
    const segment = compile(impostor(studio(), 'segment', own));
    expect(segment.uniforms.uSectionColours).toBe(own.uSectionColours);
    expect(segment.vertexShader).toContain('if ( cell.a > 0.9980392156862745 ) return cell.rgb;');
    expect(segment.vertexShader).toContain(
      'return uSectionColours[ type >= 0 && type < 5 ? type : 0 ];'
    );
    // The type in the top byte of the segment's word, and its cell below.
    expect(segment.vertexShader).toContain(
      'float sectionType() {\n\treturn float( aCell >> 24u );\n}'
    );
    expect(segment.vertexShader).toContain('return aCell & 16777215u;');
    const soma = compile(impostor(studio(), 'soma', own)).vertexShader;
    expect(soma).toContain('float sectionType() {\n\treturn 1.0;\n}');
    expect(soma).not.toContain('aCell >> 24u');
  });

  it('draws no segment of the hidden type, as none of a hole, and hides none but holes until told', () => {
    const own = impostorUniforms();
    expect(own.uHidden.value).toBe(255);
    const ids = idMaterial('segment', own);
    expect(ids.uniforms.uHidden).toBe(own.uHidden);
    const look = compile(impostor(studio(), 'segment', own));
    expect(look.uniforms.uHidden).toBe(own.uHidden);
    for (const shader of [look, compile(ids)]) {
      expect(shader.vertexShader).toContain(
        'if ( shown < 0.5 || segmentType == 255u || segmentType == uHidden ) return false;'
      );
    }
  });

  it('takes section colours in the linear space the cell table hands over, by SWC numbers', () => {
    const own = impostorUniforms();
    setSectionColours(own, {
      soma: '#aaa',
      axon: 'not a colour',
      apicalDendrite: '#b2f',
      basalDendrite: '#f55',
      unknown: '#f80',
    });
    expect(own.uSectionColours.value.map((colour) => colour.getHexString())).toEqual([
      'ff8800',
      'aaaaaa',
      'ff8800',
      'ff5555',
      'bb22ff',
    ]);
    expect(own.uSectionColours.value[1].r).toBeCloseTo(0.402, 3);
  });

  it('draws the highlighted cell in the highlight colour, unlit, and no cell so until one is', () => {
    const own = impostorUniforms();
    expect(own.uHighlighted.value).toBe(NO_CELL);
    const shader = compile(impostor(studio(), 'soma', own));
    expect(shader.vertexShader).toContain(
      'return impostorCell() == uHighlighted ? uHighlight : own;'
    );
    expect(shader.vertexShader).toContain('return cell == uHighlighted ? 0.0 :');
    expect(shader.uniforms.uHighlighted).toBe(own.uHighlighted);
    expect(shader.uniforms.uHighlight).toBe(own.uHighlight);
  });

  it.each(
    KINDS
  )("lights the $kind by its cell's glow, shaped, after the lights, its own colour unlit", ({
    kind,
  }) => {
    const own = impostorUniforms();
    expect(own.uGlow.value).toBeNull();
    const { vertexShader, fragmentShader, uniforms: read } = compile(impostor(studio(), kind, own));
    for (const name of ['uGlow', 'uSomas', 'uAfterglow', 'uNeon', 'uSpikeHue'] as const) {
      expect(read[name], name).toBe(own[name]);
    }
    // Shaped already, by the cell table.
    expect(vertexShader).toContain('texelFetch( uGlow, cellXY( cell ), 0 ).r;');
    expect(vertexShader).toContain(
      'vPulse = vGlow > 0.0 ? pulseFront( somaDistance( position ), vGlow, uAfterglow ) : 0.0;'
    );
    expect(fragmentShader).toContain('float spikeLight( float x, float glow ) {');
    expect(fragmentShader).toContain(
      'float spiking = spikeLight( vPulse, vGlow );' +
        `\n\toutgoingLight = mix( outgoingLight, spikeColour( vColor.rgb, normal.z, ${kind === 'soma' ? 'uNeon * vec2( 1.0, 0.350000 )' : 'uNeon'}, uSpikeHue ), spiking );` +
        '\n\t#include <opaque_fragment>'
    );
    expect(fragmentShader).not.toContain('uGlowRim');
    expect(redeclared(fragmentShader)).toEqual([]);
  });

  it('reads the time since a spike back from the glow the cell table keeps, a vertex at a time', () => {
    const { vertexShader, fragmentShader } = compile(impostor(studio(), 'segment', uniforms));
    expect(vertexShader).toContain('return d + 1000.000000 * afterglow * log( glow );');
    expect(fragmentShader).toContain('return glow * max( band, 0.250000 );');
  });

  it("measures a segment's way from its soma at its real ends, a soma's as none", () => {
    const segment = compile(impostor(studio(), 'segment', uniforms)).vertexShader;
    expect(segment).toContain(
      'return soma.w > 0.5 ? distance( ( corner.x > 0.0 ? aB : aA ).xyz, soma.xyz ) : 0.0;'
    );
    const soma = compile(impostor(studio(), 'soma', uniforms)).vertexShader;
    expect(soma).toContain('float somaDistance( vec3 corner ) {\n\treturn 0.0;\n}');
  });

  it("measures a segment's edge across it alone, so that the rings of two meet without a seam", () => {
    const { fragmentShader } = compile(impostor(studio(), 'segment', uniforms));
    expect(fragmentShader).toContain('edge = vec2( r * ( 1.0 - abs( s ) ), r );');
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

describe("the impostors in their cells' numbers", () => {
  it.each(KINDS)('cuts the $kind to the outline it is drawn with', ({ kind, attribute }) => {
    const { vertexShader, fragmentShader } = idMaterial(kind, uniforms);
    expect(vertexShader).toContain(attribute);
    // At its size unlit: a cell that glows is found within the size it has at rest.
    expect(vertexShader).toContain(
      'bool on = impostorCorner( position, cellTexel().a, MIN_RADIUS, corner );'
    );
    expect(vertexShader).not.toContain('uGlow');
    expect(fragmentShader).not.toContain('uGlowRim');
    expect(vertexShader).toContain('on ? projectionMatrix * vec4( corner, 1.0 )');
    expect(fragmentShader).toContain('vec3 impostorNormal( out vec2 edge ) {');
    expect(fragmentShader.indexOf('impostorNormal( edge );')).toBeLessThan(
      fragmentShader.indexOf('gl_FragColor = vId;')
    );
    expect(redeclared(vertexShader)).toEqual([]);
    expect(redeclared(fragmentShader)).toEqual([]);
  });

  it.each([
    ['segment', ['vec4 A = mix( aA, aChartA, uMix );', 'A.xyz + uShift', 'B.xyz + uShift']],
    ['soma', ['vec4 S = mix( aSoma, aSomaChart, uMix );', 'S.xyz + uShift']],
  ] as const)("places the %s where the shift and the dendrogram's mix put it, drawn and picked alike", (kind, placed) => {
    for (const { vertexShader } of [
      compile(impostor(studio(), kind, uniforms)),
      idMaterial(kind, uniforms),
    ]) {
      expect(vertexShader).toContain('uniform vec3 uShift;');
      for (const sum of placed) expect(vertexShader).toContain(sum);
    }
  });

  it("writes a soma's own depth, as where it is shaded", () => {
    expect(idMaterial('soma', uniforms).fragmentShader).toContain('gl_FragDepth =');
    expect(idMaterial('segment', uniforms).fragmentShader).not.toContain('gl_FragDepth');
  });

  it("writes the cell's number and one as it is, over what is there", () => {
    const material = idMaterial('segment', uniforms);
    expect(material.vertexShader).toContain('vId = cellId( impostorCell() );');
    expect(material.vertexShader).toContain('uint id = cell + 1u;');
    expect(material.vertexShader).toContain(
      'vec4( id & 255u, ( id >> 8u ) & 255u, ( id >> 16u ) & 255u, id >> 24u ) / 255.0'
    );
    expect(material.blending).toBe(NoBlending);
  });

  it("reads the viewer's cell table and shift, and keeps the size of what it is drawn into", () => {
    const own = impostorUniforms();
    const material = idMaterial('soma', own);
    expect(material.uniforms.uCells).toBe(own.uCells);
    expect(material.uniforms.uViewport).toBe(own.uViewport);
    expect(material.uniforms.uShift).toBe(own.uShift);

    const renderer = { getCurrentViewport: (v: THREE.Vector4) => v.set(-636, -396, 2560, 1600) };
    const draw = material.onBeforeRender as unknown as (renderer: unknown) => void;
    draw.call(material, renderer);
    expect(own.uViewport.value.toArray()).toEqual([-636, -396, 2560, 1600]);
  });
});

describe('the cell of a pick', () => {
  /** A square of pixels three wide with these cells drawn at these places, a row after another. */
  function square(cells: Record<number, number>): Uint8Array {
    const pixels = new Uint8Array(4 * 9);
    for (const [place, cell] of Object.entries(cells)) {
      new DataView(pixels.buffer).setUint32(4 * Number(place), cell + 1, true);
    }
    return pixels;
  }

  it('is none where nothing is drawn', () => {
    expect(cellNearMiddle(square({}), 3)).toBeNull();
  });

  it('is the one drawn at the middle, whatever is around it', () => {
    expect(cellNearMiddle(square({ 0: 5, 3: 6, 4: 7, 8: 8 }), 3)).toBe(7);
  });

  it('is the nearest to the middle where the middle has none', () => {
    expect(cellNearMiddle(square({ 0: 5, 7: 6 }), 3)).toBe(6);
    expect(cellNearMiddle(square({ 8: 5 }), 3)).toBe(5);
  });

  it('has its number from all four bytes', () => {
    expect(cellNearMiddle(square({ 4: 0 }), 3)).toBe(0);
    expect(cellNearMiddle(square({ 4: 70_000 }), 3)).toBe(70_000);
    expect(cellNearMiddle(square({ 4: 3_000_000_000 }), 3)).toBe(3_000_000_000);
  });
});

describe('`lifted`, as the segments and the somas share it', () => {
  it('lifts the whole way in an orthographic view, and in perspective by half the depth at most, behind the near plane', () => {
    expect(LIFTED).toContain('if ( isOrthographic ) return vec3( p.xy, p.z + lift );');
    expect(LIFTED).toContain(
      'float near = projectionMatrix[ 3 ][ 2 ] / ( projectionMatrix[ 2 ][ 2 ] - 1.0 );'
    );
    expect(LIFTED).toContain(
      'float z = max( p.z, min( p.z + lift, min( 0.5 * p.z, - 1.01 * near ) ) );'
    );
  });
});
