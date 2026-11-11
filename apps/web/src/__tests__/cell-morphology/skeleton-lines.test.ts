// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  overlayMaterial,
  skeletonStyle,
  standInMaterial,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/skeleton-lines';

import type * as THREE from 'three';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';

/** The vertex shader three would compile for `m`. */
function vertexShader(m: LineMaterial): string {
  const shader = {
    vertexShader: m.vertexShader,
    fragmentShader: m.fragmentShader,
    uniforms: m.uniforms,
  } as THREE.WebGLProgramParametersWithUniforms;
  m.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
  return shader.vertexShader;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('skeletonStyle', () => {
  it('stands the traced skeleton in for the mesh, as wide as its fibres, until the mesh comes', () => {
    expect(skeletonStyle(null, false, true)).toEqual({
      kind: 'original',
      body: true,
      line: false,
      casing: false,
    });
    expect(skeletonStyle('processed', false, true).kind).toBe('original');
  });

  it('draws the chosen skeleton over the mesh as a line in its casing', () => {
    expect(skeletonStyle('processed', true, true)).toEqual({
      kind: 'processed',
      body: false,
      line: true,
      casing: true,
    });
    expect(skeletonStyle(null, true, true).kind).toBeNull();
  });

  it('draws the line alone with the mesh turned off', () => {
    expect(skeletonStyle('original', true, false)).toEqual({
      kind: 'original',
      body: false,
      line: true,
      casing: false,
    });
    expect(skeletonStyle(null, false, false)).toMatchObject({ kind: 'original', line: true });
  });
});

describe('the skeleton line materials', () => {
  it("patch the installed three's line shader", () => {
    const warn = vi.spyOn(console, 'warn');
    const overlay = vertexShader(overlayMaterial({}));
    const standIn = vertexShader(standInMaterial({}));
    expect(warn).not.toHaveBeenCalled();
    expect(overlay).toContain('if ( instanceStart == instanceEnd )');
    expect(standIn).toContain('attribute vec2 instanceRadius;');
    expect(standIn).toContain('vec2( 1.0, 0.0 )');
    expect(standIn).toContain('max( linewidth, fibre');
  });

  it('keep their programs apart', () => {
    expect(overlayMaterial({}).customProgramCacheKey()).not.toBe(
      standInMaterial({}).customProgramCacheKey()
    );
  });
});
