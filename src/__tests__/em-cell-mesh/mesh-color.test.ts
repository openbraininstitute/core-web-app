// @vitest-environment jsdom
import chroma from 'chroma-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MESH_COLORS,
  storedMeshColor,
  storeMeshColor,
} from '@/features/entities/em-cell-mesh/viewer/mesh-color';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('the mesh colour', () => {
  it('comes back from the last visit where it is a colour, and is cobalt otherwise', () => {
    expect(storedMeshColor()).toBe('cobalt');
    for (const kept of ['teal', 'slate', '#2FB6B6']) {
      storeMeshColor(kept);
      expect(storedMeshColor()).toBe(kept);
    }
    for (const kept of ['mauve', '#2fb6b', 'rgb(0, 0, 0)']) {
      localStorage.setItem('em-mesh-color', kept);
      expect(storedMeshColor(), kept).toBe('cobalt');
    }
  });

  it('holds for the visit only where storage is blocked', () => {
    const denied = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied);
    expect(() => storeMeshColor('teal')).not.toThrow();
    expect(storedMeshColor()).toBe('cobalt');
  });

  it('is as colourful over the dark background as over the light one, at an OKLCH lightness of 0.72', () => {
    for (const { id, colors } of MESH_COLORS.filter((c) => c.id !== 'slate')) {
      const [, c, h] = chroma(colors.light).oklch();
      const [darkL, darkC, darkH] = chroma(colors.dark).oklch();
      expect(darkL, id).toBeCloseTo(0.72, 2);
      expect(darkC, id).toBeCloseTo(c, 2);
      expect(Math.abs(darkH - h), id).toBeLessThan(3);
    }
  });
});
