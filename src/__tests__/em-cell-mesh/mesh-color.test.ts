// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
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
});
