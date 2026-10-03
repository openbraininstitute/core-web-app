// @vitest-environment node
import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createLooks, type Look, withDisplacement } from '@/features/viewer-3d/engine/looks';

/** The shader lib entry three compiles a built-in material from (WebGLPrograms' `shaderIDs`). */
const SHADER_IDS: Record<string, string> = {
  MeshBasicMaterial: 'basic',
  MeshToonMaterial: 'toon',
  MeshStandardMaterial: 'physical',
  MeshPhysicalMaterial: 'physical',
  MeshMatcapMaterial: 'matcap',
  MeshNormalMaterial: 'normal',
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

/** The functions and globals declared more than once in a shader, which GLSL refuses: two hooks bringing the same code. */
function redeclared(source: string): string[] {
  const names = [
    ...source.matchAll(
      /^\s*(?:(?:uniform|varying|attribute)\s+\w+\s+(\w+);|\w+\s+(\w+)\(.*\)\s*\{)\s*$/gm
    ),
  ].map((m) => m[1] ?? m[2]);
  return names.filter((n, i) => names.indexOf(n) !== i);
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
        expect(redeclared(s.vertexShader), l.id).toEqual([]);
        expect(redeclared(s.fragmentShader), l.id).toEqual([]);
      }
    }
  });

  it('pushes the toon outline out by pixels, from the displaced surface', () => {
    const v = compile(looks.find((l) => l.outline)!.outline!).vertexShader;
    expect(v).toContain('float pixelSize( vec3 p )');
    const push = v.indexOf('pixelSize( transformed )');
    expect(push).toBeGreaterThan(v.indexOf('transformed = displacedPosition;'));
  });

  it("shades the bumps per fragment in every look on three's own materials", () => {
    const perVertex: string[] = [];
    for (const l of looks) {
      const s = compile(l.material);
      const tilted = s.vertexShader.includes('objectNormal = displacedNormal;');
      if (!s.fragmentShader.includes('bumpField( vBumpPosition / uBumpScale, bumpFootprint )')) {
        expect(tilted, l.id).toBe(true);
        perVertex.push(l.id);
        continue;
      }
      // The vertex's normal stays untilted, and so does what three's specular anti-aliasing reads.
      expect(tilted, l.id).toBe(false);
      expect(s.fragmentShader, l.id).not.toContain('nonPerturbedNormal =');
      expect(s.vertexShader, l.id).toContain('vBumpPosition = position;');
      // The bumps' normal replaces the interpolated one once the chunk has set it up.
      expect(s.fragmentShader.indexOf('#include <normal_fragment_begin>'), l.id).toBeLessThan(
        s.fragmentShader.indexOf('bumpN =')
      );
      // And the clearcoat's, where there is one.
      const clearcoat = s.fragmentShader.indexOf('#include <clearcoat_normal_fragment_begin>');
      if (clearcoat >= 0)
        expect(s.fragmentShader.indexOf('clearcoatNormal = normal;'), l.id).toBeGreaterThan(
          clearcoat
        );
    }
    expect(perVertex).toEqual(['fluorescence', 'cajal', 'depth-coded']);
  });

  it('shades the bumps per fragment in a shader without `common`, and per vertex where asked to', () => {
    const perFragment = compile(withDisplacement(new THREE.MeshNormalMaterial()));
    expect(perFragment.fragmentShader).toContain('bumpN =');
    expect(perFragment.fragmentShader).toContain('vec4 bumpField(');
    expect(redeclared(perFragment.fragmentShader)).toEqual([]);
    // The occlusion pass's normals, which follow its depth.
    const perVertex = compile(
      withDisplacement(new THREE.MeshNormalMaterial(), { perFragment: false })
    );
    expect(perVertex.vertexShader).toContain('objectNormal = displacedNormal;');
    expect(perVertex.fragmentShader).not.toContain('bumpN =');
  });

  it('gives the EM look its type tint and grain', () => {
    const s = compile(looks.find((l) => l.id === 'em')!.material);
    expect(s.fragmentShader).toContain('uTypeTint );');
    expect(s.fragmentShader).not.toContain('#include <color_fragment>');
    expect(s.fragmentShader).toContain('( rand( gl_FragCoord.xy ) - 0.5 ) * uGrain');
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

describe('looks for a surface without colours, types or radii', () => {
  let bare: Look[];

  beforeAll(() => {
    bare = createLooks(1, []);
  });

  it('leaves out the looks that need what the surface lacks', () => {
    expect(bare.map((l) => l.id)).toEqual(
      looks.filter((l) => l.id !== 'fluorescence').map((l) => l.id)
    );
  });

  it('draws in a colour of its theme where the neurite colours would go: darker than a light background, lighter than a dark one', () => {
    for (const l of bare) {
      expect((l.material as THREE.MeshStandardMaterial).vertexColors, l.id).toBeFalsy();
      expect(compile(l.material).fragmentShader, l.id).not.toContain('vColor');
    }
    const luminance = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    const painted = bare.filter((l) => l.colors === 'palette');
    expect(painted).toHaveLength(7);
    for (const l of painted) {
      const { color } = l.material as THREE.MeshStandardMaterial;
      expect(color.getHexString(), l.id).toBe(l.plain?.light.slice(1));
      for (const dark of [true, false]) {
        const theme = dark ? 'dark' : 'light';
        l.onTheme?.(dark);
        expect(color.getHexString(), `${l.id}, ${theme}`).toBe(l.plain?.[theme].slice(1));
        const background = new THREE.Color(l.background[theme][0]);
        expect(luminance(color) > luminance(background), `${l.id}, ${theme}`).toBe(dark);
      }
    }
    // A surface with its own colours keeps them in either theme.
    for (const l of looks.filter((x) => x.colors === 'palette'))
      expect(l.onTheme, l.id).toBeUndefined();
  });

  it("neither bumps nor widens the surface, and pushes the toon outline out by pixels at the model's scale", () => {
    for (const l of bare) {
      expect(compile(l.material).vertexShader, l.id).not.toContain('bumpDisplace');
    }
    // EM segmentation still brings its occlusion, and no longer promises bumps.
    const em = bare.find((l) => l.id === 'em');
    expect(em?.bumps).toBeUndefined();
    expect(em?.ao).toBe(true);
    expect(em?.hint).not.toContain('bumps');
    expect(looks.find((l) => l.id === 'em')?.hint).toContain('bumps');
    const outline = bare.find((l) => l.outline)?.outline as THREE.Material;
    const s = compile(outline);
    expect(s.vertexShader).toContain('length( modelMatrix[ 0 ].xyz )');
    expect(s.vertexShader.indexOf('float pixelSize( vec3 p )')).toBeLessThan(
      s.vertexShader.indexOf('pixelSize( transformed )')
    );
    expect(s.vertexShader).not.toContain('widenToPixels');
    expect(s.uniforms.uViewHeight).toBeDefined();
    expect(redeclared(s.vertexShader)).toEqual([]);
  });

  it("places the gold leaf's flakes in world space, displaced or not", () => {
    for (const set of [looks, bare]) {
      const s = compile(set.find((l) => l.id === 'gold-leaf')?.material as THREE.Material);
      expect(s.vertexShader).toContain(
        'vGlintPosition = ( modelMatrix * vec4( position, 1.0 ) ).xyz;'
      );
      expect(s.fragmentShader).toContain('mat3( viewMatrix ) * tilt');
      // The flakes are placed by the bumps' hash, which must come first.
      expect(s.fragmentShader.indexOf('vec3 latticeRandom(')).toBeGreaterThan(-1);
      expect(s.fragmentShader.indexOf('float glintFlakes(')).toBeGreaterThan(
        s.fragmentShader.indexOf('vec3 latticeRandom(')
      );
      expect(redeclared(s.vertexShader)).toEqual([]);
      expect(redeclared(s.fragmentShader)).toEqual([]);
    }
  });
});
