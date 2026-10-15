import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearLoading,
  markLoading,
  stoppedLoading,
} from '@/features/entities/em-cell-mesh/viewer/load-mark';

/** The Web Locks held in the origin. */
let held: string[];

beforeEach(() => {
  held = [];
  localStorage.clear();
  vi.stubGlobal('navigator', {
    locks: {
      async request(name: string, _options: unknown, work: () => Promise<void>) {
        held.push(name);
        try {
          return await work();
        } finally {
          held.splice(held.indexOf(name), 1);
        }
      },
      query: async () => ({ held: held.map((name) => ({ name })) }),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the load mark', () => {
  it('is not heeded while the tab that set it holds its lock, as after an upload outside the decode lock', async () => {
    markLoading('glb', 'full');
    await settle();
    expect(held).toEqual(['em-mesh-load:glb']);
    expect(await stoppedLoading('glb')).toBeNull();

    clearLoading('glb');
    await settle();
    expect(held).toEqual([]);
    expect(localStorage.getItem('em-mesh-load:glb')).toBeNull();
  });

  it('is heeded where no tab holds its lock: the one that set it was stopped', async () => {
    localStorage.setItem('em-mesh-load:glb', 'decode');
    expect(await stoppedLoading('glb')).toBe('decode');
  });

  it('holds one lock however many stages mark it, and lets go of one cleared before it was granted', async () => {
    markLoading('glb', 'decode');
    markLoading('glb', 'stand-in');
    clearLoading('glb');
    await settle();
    expect(held).toEqual([]);
  });
});
