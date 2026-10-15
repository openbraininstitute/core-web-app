import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  TreeLoader,
  type TreeSource,
  useTreeMorphologies,
} from '@/features/circuit-viewer/morphologies/use-tree-morphologies';
import { SectionType } from '@/features/circuit-viewer/section-type';

import type { SectionsRequest } from '@/features/circuit-viewer/morphologies/load/read-sections';
import type { Sections } from '@/features/scan-config/types';

const h = vi.hoisted(() => ({ logError: vi.fn(), loadSections: vi.fn() }));

vi.mock('@/utils/logger', () => ({ logError: h.logError }));
vi.mock('@/features/circuit-viewer/morphologies/load/read-sections', () => ({
  loadSections: h.loadSections,
}));

/** A soma 6 µm round, a dendrite of one segment and an axon of one, each from a stem. */
const SECTIONS: Sections = [
  {
    id: 'soma',
    sonata_section_id: 0,
    parent_id: null,
    type: SectionType.Soma,
    points: [[0, 0, 0]],
    radii: [6],
  },
  {
    id: '0',
    sonata_section_id: 1,
    parent_id: 'soma',
    type: SectionType.BasalDendrite,
    points: [
      [6, 0, 0],
      [16, 0, 0],
    ],
    radii: [1, 1],
  },
  {
    id: '1',
    sonata_section_id: 2,
    parent_id: 'soma',
    type: SectionType.Axon,
    points: [
      [0, -6, 0],
      [0, -26, 0],
    ],
    radii: [0.5, 0.5],
  },
];

const request = (path: string): SectionsRequest => ({
  path,
  virtualLabId: 'lab',
  projectId: 'project',
});

/** Cells 0 and 1 of A and cell 2 of B have morphologies; the two of the inputs have none. */
function source(): TreeSource {
  return {
    somas: {
      positions: Float32Array.of(0, 0, 0, 100, 0, 0, 200, 0, 0, 0, 100, 0, 0, 200, 0),
      populations: [
        { name: 'A', cells: 2 },
        { name: 'B', cells: 1 },
        { name: 'inputs', cells: 2 },
      ],
    },
    orientations: null,
    requests: [request('a0'), request('a1'), request('b0'), null, null],
  };
}

/** A read for every request, settled by the test. */
function reads() {
  const pending: { path: string; resolve(sections: Sections): void; reject(e: Error): void }[] = [];
  const read = vi.fn(
    ({ path }: SectionsRequest) =>
      new Promise<Sections>((resolve, reject) => {
        pending.push({ path, resolve, reject });
      })
  );
  /** Settle the read waiting, and let the loader take it and ask for the next. */
  const settle = async (with_: Sections | Error = SECTIONS) => {
    const next = pending.shift();
    if (!next) throw new Error('no read waiting');
    if (with_ instanceof Error) next.reject(with_);
    else next.resolve(with_);
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { read, pending, settle };
}

const segmentsOf = (loader: TreeLoader) => loader.dataAt(loader.getSnapshot().version).segmentCells;
const somaRadii = (loader: TreeLoader) => {
  const { somas } = loader.dataAt(loader.getSnapshot().version);
  return Array.from({ length: somas.length / 4 }, (_, cell) => somas[4 * cell + 3]);
};

afterEach(() => {
  h.logError.mockReset();
  h.loadSections.mockReset();
});

describe("a small circuit's morphologies, read one at a time", () => {
  it("reads them one after another in the cells' order, counting those in", async () => {
    const { read, settle } = reads();
    const loader = new TreeLoader(source(), read);
    loader.load(false, []);
    expect(read.mock.calls.map(([r]) => r.path)).toEqual(['a0']);
    expect(loader.getSnapshot()).toMatchObject({ loaded: 0, total: 3 });
    await settle();
    expect(read.mock.calls.map(([r]) => r.path)).toEqual(['a0', 'a1']);
    expect(loader.getSnapshot()).toMatchObject({ loaded: 1, total: 3 });
    await settle();
    await settle();
    expect(read).toHaveBeenCalledTimes(3);
    expect(loader.getSnapshot()).toMatchObject({ loaded: 3, total: 3 });
  });

  it('draws each cell as its soma until its morphology is in, and the cells with none as somas throughout', async () => {
    const { read, settle } = reads();
    const loader = new TreeLoader(source(), read);
    loader.load(false, []);
    expect(somaRadii(loader)).toEqual([8, 8, 8, 8, 8]);
    expect(segmentsOf(loader)).toHaveLength(0);
    await settle();
    expect(somaRadii(loader)).toEqual([6, 8, 8, 8, 8]);
    // Its dendrite and that dendrite's stem; no axon.
    expect(Array.from(segmentsOf(loader))).toEqual([0, 0]);
  });

  it('reads none of a hidden population, nor counts it', async () => {
    const { read, settle } = reads();
    const loader = new TreeLoader(source(), read);
    loader.load(false, ['A']);
    expect(loader.getSnapshot()).toMatchObject({ loaded: 0, total: 1 });
    await settle();
    expect(read.mock.calls.map(([r]) => r.path)).toEqual(['b0']);
  });

  it('reads them all again for the axons, the ones in place drawn till theirs come', async () => {
    const { read, settle } = reads();
    const loader = new TreeLoader(source(), read);
    loader.load(false, []);
    for (let i = 0; i < 3; i++) await settle();
    loader.load(true, []);
    expect(loader.getSnapshot()).toMatchObject({ loaded: 0, total: 3 });
    expect(segmentsOf(loader)).toHaveLength(6);
    await settle();
    expect(loader.getSnapshot()).toMatchObject({ loaded: 1, total: 3 });
    expect(Array.from(segmentsOf(loader))).toEqual([0, 0, 0, 0, 1, 1, 2, 2]);
  });

  it('leaves a cell it could not read as its soma, counted in, and reads it again on a retry', async () => {
    const { read, settle } = reads();
    const loader = new TreeLoader(source(), read);
    loader.load(false, []);
    await settle();
    await settle(new Error('Morphology "a1" could not be loaded.'));
    await settle();
    expect(h.logError).toHaveBeenCalledTimes(1);
    expect(loader.getSnapshot()).toMatchObject({ loaded: 3, total: 3 });
    expect(somaRadii(loader)).toEqual([6, 8, 6, 8, 8]);
    loader.retry([]);
    expect(read.mock.calls.map(([r]) => r.path)).toEqual(['a0', 'a1', 'b0', 'a1']);
    expect(loader.getSnapshot()).toMatchObject({ loaded: 2, total: 3 });
    await settle();
    expect(somaRadii(loader)).toEqual([6, 6, 6, 8, 8]);
  });

  it('keeps what a run read for the axons over what the run before it read without, whichever comes in last', async () => {
    const { read, pending, settle } = reads();
    const loader = new TreeLoader(source(), read);
    loader.load(false, []);
    loader.load(true, []);
    expect(pending.map((p) => p.path)).toEqual(['a0', 'a0']);
    const without = pending.shift();
    await settle();
    without?.resolve(SECTIONS);
    await new Promise((resolve) => setTimeout(resolve, 0));
    // The dendrite and the axon, each with its stem.
    expect(Array.from(segmentsOf(loader))).toEqual([0, 0, 0, 0]);
  });

  it('reads no more once stopped, keeping what was being read', async () => {
    const { read, settle } = reads();
    const loader = new TreeLoader(source(), read);
    loader.load(false, []);
    loader.stop();
    await settle();
    expect(read).toHaveBeenCalledTimes(1);
    expect(somaRadii(loader)[0]).toBe(6);
  });

  it('places the cells once for every morphology that came in since', async () => {
    const { read, settle } = reads();
    const loader = new TreeLoader(source(), read);
    loader.load(false, []);
    const before = loader.getSnapshot().version;
    await settle();
    await settle();
    const { version } = loader.getSnapshot();
    expect(version).toBeGreaterThan(before);
    expect(loader.dataAt(version)).toBe(loader.dataAt(version));
  });

  it('keeps the cells as placed where a load reads nothing new', async () => {
    const { read, settle } = reads();
    const loader = new TreeLoader(source(), read);
    loader.load(false, []);
    for (let i = 0; i < 3; i++) await settle();
    const placed = loader.dataAt(loader.getSnapshot().version);
    loader.load(false, ['B']);
    expect(loader.getSnapshot()).toMatchObject({ loaded: 2, total: 2 });
    expect(loader.dataAt(loader.getSnapshot().version)).toBe(placed);
  });

  it('tells its listeners once for a run of morphologies that come in together', async () => {
    const loader = new TreeLoader(source(), () => Promise.resolve(SECTIONS));
    const heard = vi.fn();
    loader.subscribe(heard);
    loader.load(false, []);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loader.getSnapshot()).toMatchObject({ loaded: 3, total: 3 });
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('centres the cells on their mean, as the view centres the somas it frames', () => {
    const loader = new TreeLoader(source(), reads().read);
    expect(loader.dataAt(0).centre).toEqual([60, 60, 0]);
  });
});

describe('the hook over the loader', () => {
  it('has every cell as a soma at once, then its morphology, and stops reading when it goes', async () => {
    h.loadSections.mockResolvedValue(SECTIONS);
    const given = source();
    const hidden: string[] = [];
    const { result, unmount } = renderHook(() =>
      useTreeMorphologies(given, { axons: false, hidden })
    );
    expect(result.current.data?.somas).toHaveLength(20);
    await waitFor(() => expect(result.current).toMatchObject({ loaded: 3, total: 3 }));
    expect(result.current.data?.segmentCells).toHaveLength(6);
    unmount();
    expect(h.loadSections).toHaveBeenCalledTimes(3);
  });

  it('has nothing without a source', () => {
    const hidden: string[] = [];
    const { result } = renderHook(() => useTreeMorphologies(null, { axons: false, hidden }));
    expect(result.current).toMatchObject({ data: null, loaded: 0, total: 0 });
    act(() => result.current.retry());
  });
});
