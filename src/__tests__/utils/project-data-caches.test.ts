import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  claimProjectDataCaches,
  clearProjectDataCaches,
  disownProjectDataCaches,
  ProjectDataCache,
} from '@/utils/project-data-caches';

let held: Set<string>;
let dropped: string[];
let deleteCache: (name: string) => Promise<boolean>;
let listCaches: () => Promise<string[]>;

beforeEach(() => {
  held = new Set();
  dropped = [];
  deleteCache = async (name) => held.delete(name);
  listCaches = async () => [...held];
  vi.stubGlobal('caches', {
    delete: (name: string) => {
      dropped.push(name);
      return deleteCache(name);
    },
    keys: () => listCaches(),
  });
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const everyBucket = Object.values(ProjectDataCache);
const OLDER = 'project-data:202611011:cache:circuit-h5';
const NEWER = 'project-data:202612011:cache:circuit-h5';
const UNKNOWN = 'project-data:202611201:cache:not-yet-built';

describe('clearProjectDataCaches', () => {
  it('deletes every bucket, and the ones under their names before versioning', async () => {
    expect(await clearProjectDataCaches()).toBe(true);
    expect(dropped).toEqual(
      expect.arrayContaining([...everyBucket, 'obi-circuit-h5-v1', 'circuit-morphology-mpack'])
    );
  });

  it('deletes the buckets of any other version, and those of a later build', async () => {
    held = new Set([OLDER, NEWER, UNKNOWN, 'unrelated']);
    expect(await clearProjectDataCaches()).toBe(true);
    expect([...held]).toEqual(['unrelated']);
  });

  it('counts a bucket that was not there as gone', async () => {
    expect(await clearProjectDataCaches()).toBe(true);
  });

  it('says so where one of them will not go', async () => {
    deleteCache = async (name) => {
      if (name === ProjectDataCache.CircuitH5) throw new Error('blocked');
      return true;
    };
    expect(await clearProjectDataCaches()).toBe(false);
  });

  it('deletes the buckets it knows, and says it may have missed some, where it can not list them', async () => {
    listCaches = async () => {
      throw new Error('blocked');
    };
    expect(await clearProjectDataCaches()).toBe(false);
    expect(dropped).toEqual(expect.arrayContaining(everyBucket));
  });
});

describe('claimProjectDataCaches', () => {
  it('deletes the buckets for a user signing in to a browser without a note of their owner', async () => {
    await claimProjectDataCaches('user-a');
    expect(dropped).toEqual(expect.arrayContaining(everyBucket));
  });

  it('leaves the buckets to the user who filled them', async () => {
    await claimProjectDataCaches('user-a');
    held = new Set(everyBucket);
    dropped = [];
    await claimProjectDataCaches('user-a');
    expect(dropped).toEqual([]);
  });

  it("deletes only the older versions of the user's own buckets", async () => {
    await claimProjectDataCaches('user-a');
    held = new Set([...everyBucket, OLDER, NEWER, UNKNOWN]);
    await claimProjectDataCaches('user-a');
    expect([...held].sort()).toEqual([...everyBucket, NEWER, UNKNOWN].sort());
  });

  it("deletes another user's buckets", async () => {
    await claimProjectDataCaches('user-a');
    dropped = [];
    await claimProjectDataCaches('user-b');
    expect(dropped).toEqual(expect.arrayContaining(everyBucket));
  });

  it('deletes them again once disowned, for the same user too', async () => {
    await claimProjectDataCaches('user-b');
    disownProjectDataCaches();
    dropped = [];
    await claimProjectDataCaches('user-b');
    expect(dropped).toEqual(expect.arrayContaining(everyBucket));
  });

  it('keeps no plain user id', async () => {
    await claimProjectDataCaches('user-a');
    const note = localStorage.getItem('project-data:202611201:owner:user');
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
