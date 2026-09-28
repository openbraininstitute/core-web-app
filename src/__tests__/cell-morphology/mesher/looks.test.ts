// @vitest-environment node
import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  createLooks,
  type Look,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/looks';

/** The shader lib entry three compiles a built-in material from (WebGLPrograms' `shaderIDs`). */
const SHADER_IDS: Record<string, string> = {
  MeshBasicMaterial: 'basic',
  MeshToonMaterial: 'toon',
  MeshStandardMaterial: 'physical',
  MeshPhysicalMaterial: 'physical',
  MeshMatcapMaterial: 'matcap',
};

/** What three hands a material's `onBeforeCompile`: the shader sources, includes not yet resolved. */
function compile(m: THREE.Material): {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, THREE.IUniform>;
} {
  const sm = m as THREE.ShaderMaterial;
  const src = sm.isShaderMaterial ? sm : THREE.ShaderLib[SHADER_IDS[m.type]];
  const shader = {
    vertexShader: src.vertexShader,
    fragmentShader: src.fragmentShader,
    uniforms: THREE.UniformsUtils.clone(src.uniforms),
  };
  m.onBeforeCompile(
    shader as unknown as THREE.WebGLProgramParametersWithUniforms,
    null as unknown as THREE.WebGLRenderer
  );
  return shader;
}

let looks: Look[];

beforeAll(() => {
  // The matcaps are drawn on a 2D canvas; a stub is enough to build them.
  const context = { createRadialGradient: () => ({ addColorStop() {} }), fillRect() {} };
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
  looks = createLooks(1);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('looks', () => {
  it("displaces every look's surface by the bumps and the width floor", () => {
    for (const l of looks) {
      for (const m of [l.material, l.outline].filter((x): x is THREE.Material => x !== undefined)) {
        const s = compile(m);
        expect(s.vertexShader, l.id).toContain(
          'bumpDisplace( displacedPosition, displacedNormal, radius )'
        );
        // A string replace whose anchor is gone does nothing: every look must hand the displaced position on.
        expect(s.vertexShader, l.id).toContain('transformed = displacedPosition;');
        expect(s.uniforms.uBumpAmp, l.id).toBeDefined();
        // The width floor rides on the same hook, before the position is handed on.
        expect(s.vertexShader, l.id).toContain(
          'widenToPixels( displacedPosition, normal, radius )'
        );
        expect(s.uniforms.uMinWidth, l.id).toBeDefined();
      }
    }
  });

  it('pushes the toon outline out by pixels, from the displaced surface', () => {
    const v = compile(looks.find((l) => l.outline)!.outline!).vertexShader;
    expect(v).toContain('float pixelSize( vec3 p )');
    const push = v.indexOf('pixelSize( transformed )');
    expect(push).toBeGreaterThan(v.indexOf('transformed = displacedPosition;'));
  });

  it('gives the EM look its per-fragment bumps, type tint and grain', () => {
    const s = compile(looks.find((l) => l.id === 'em')!.material);
    expect(s.vertexShader).toContain('vBumpPosition = position;');
    expect(s.fragmentShader).toContain('bumpField( vBumpPosition / uBumpScale )');
    expect(s.fragmentShader).toContain('uTypeTint );');
    expect(s.fragmentShader).not.toContain('#include <color_fragment>');
    expect(s.fragmentShader).toContain('( rand( gl_FragCoord.xy ) - 0.5 ) * uGrain');
    // The bumps' normal replaces the interpolated one after the chunk that sets it up.
    expect(s.fragmentShader.indexOf('#include <normal_fragment_maps>')).toBeLessThan(
      s.fragmentShader.indexOf('bumpN =')
    );
  });

  it("adds the gold leaf's flakes to the light once it is all gathered, before it is written out", () => {
    const gold = compile(looks.find((l) => l.id === 'gold-leaf')!.material).fragmentShader;
    const flakes = gold.indexOf('outgoingLight += uGlintColor * glint;');
    expect(flakes).toBeGreaterThan(gold.indexOf('vec3 outgoingLight ='));
    expect(flakes).toBeLessThan(gold.indexOf('#include <opaque_fragment>'));
  });

  it('says which looks the neurite colours reach: those whose material reads the vertex colours', () => {
    for (const l of looks) {
      const reads =
        (l.material as THREE.Material & { vertexColors?: boolean }).vertexColors === true;
      expect(reads, l.id).toBe(l.colors !== 'own');
    }
    expect(looks.filter((l) => l.colors === 'tint').map((l) => l.id)).toEqual(['em']);
    expect(looks.filter((l) => l.legend).map((l) => l.id)).toEqual(['fluorescence', 'depth-coded']);
  });

  it('gives the custom shaders one view direction for an orthographic camera', () => {
    for (const l of looks) {
      if (l.material.type !== 'ShaderMaterial') continue;
      const v = compile(l.material).vertexShader;
      expect(v, l.id).toContain(
        'vec3 viewDir = isOrthographic ? vec3( 0.0, 0.0, 1.0 ) : normalize( - mv.xyz );'
      );
      // The helper's line is the only one that may take the direction from the position.
      expect(v.split('mv.xyz').length - 1, l.id).toBe(1);
    }
  });

  it("keys two looks' programs alike only if their shaders are alike", () => {
    const byKey = new Map<string, Look>();
    for (const l of looks) {
      if (l.material.type === 'ShaderMaterial') continue;
      const key = `${l.material.type}|${l.material.customProgramCacheKey()}`;
      const other = byKey.get(key);
      if (other)
        expect(compile(other.material).fragmentShader, `${other.id} and ${l.id}`).toBe(
          compile(l.material).fragmentShader
        );
      byKey.set(key, l);
    }
  });
});
