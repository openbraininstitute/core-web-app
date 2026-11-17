import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  claimProjectDataCaches,
  clearProjectDataCaches,
  PROJECT_DATA_CACHES,
} from '@/utils/project-data-caches';

let dropped: string[];
let deleteCache: (name: string) => Promise<boolean>;

beforeEach(() => {
  dropped = [];
  deleteCache = async () => true;
  vi.stubGlobal('caches', {
    delete: (name: string) => {
      dropped.push(name);
      return deleteCache(name);
    },
  });
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const everyBucket = Object.values(PROJECT_DATA_CACHES);

describe('clearProjectDataCaches', () => {
  it('deletes every bucket, and the ones under their earlier names', async () => {
    expect(await clearProjectDataCaches()).toBe(true);
    expect(dropped).toEqual(expect.arrayContaining([...everyBucket, 'obi-circuit-h5-v1']));
  });

  it('counts a bucket that was not there as gone', async () => {
    deleteCache = async () => false;
    expect(await clearProjectDataCaches()).toBe(true);
  });

  it('says so where one of them will not go', async () => {
    deleteCache = async (name) => {
      if (name === PROJECT_DATA_CACHES.circuitH5) throw new Error('blocked');
      return true;
    };
    expect(await clearProjectDataCaches()).toBe(false);
  });
});

describe('claimProjectDataCaches', () => {
  it('deletes the buckets for a user signing in to a browser without a note of their owner', async () => {
    await claimProjectDataCaches('user-a');
    expect(dropped).toEqual(expect.arrayContaining(everyBucket));
  });

  it('leaves the buckets to the user who filled them', async () => {
    await claimProjectDataCaches('user-a');
    dropped = [];
    await claimProjectDataCaches('user-a');
    expect(dropped).toEqual([]);
  });

  it("deletes another user's buckets", async () => {
    await claimProjectDataCaches('user-a');
    dropped = [];
    await claimProjectDataCaches('user-b');
    expect(dropped).toEqual(expect.arrayContaining(everyBucket));
  });

  it('keeps no plain user id', async () => {
    await claimProjectDataCaches('user-a');
    const note = localStorage.getItem('project-data-owner');
    expect(note).toMatch(/^[0-9a-f]{64}$/);
    expect(note).not.toContain('user-a');
  });

  it('notes no owner where the buckets did not all go, so the next load tries again', async () => {
    deleteCache = async () => {
      throw new Error('blocked');
    };
    await claimProjectDataCaches('user-a');
    deleteCache = async () => true;
    dropped = [];
    await claimProjectDataCaches('user-a');
    expect(dropped).toEqual(expect.arrayContaining(everyBucket));
  });

  it('deletes the buckets each time where it can not keep its note', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    await claimProjectDataCaches('user-a');
    dropped = [];
    await claimProjectDataCaches('user-a');
    expect(dropped).toEqual(expect.arrayContaining(everyBucket));
  });
});
