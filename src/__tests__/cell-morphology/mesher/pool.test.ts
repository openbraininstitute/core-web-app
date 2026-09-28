// @vitest-environment node
import * as Comlink from 'comlink';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createMesherApi } from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher-api';
import { MeshPool } from '@/features/entities/cell-morphology/morpho-viewer/engine/pool';
import { GpuError } from '@/features/entities/cell-morphology/morpho-viewer/engine/protocol';

import { BRANCHED, expectWatertight, params } from './mesh-utils';

function asWorker({ port1, port2 }: MessageChannel): Worker {
  return Object.assign(port1, {
    terminate: () => {
      port1.close();
      port2.close();
    },
  }) as unknown as Worker;
}

function inProcessWorker(): Worker {
  const channel = new MessageChannel();
  Comlink.expose(createMesherApi(), channel.port2);
  return asWorker(channel);
}

const pools: MeshPool[] = [];
function pool(size: number, createWorker = inProcessWorker): MeshPool {
  const p = new MeshPool(size, createWorker);
  pools.push(p);
  return p;
}

afterEach(() => {
  for (const p of pools.splice(0)) p.dispose();
});

describe('MeshPool over Comlink', () => {
  it('loads and builds a closed mesh across workers', async () => {
    const p = pool(2);
    const { summary, skeleton } = await p.load(BRANCHED);
    expect(summary.nodeCount).toBe(8);
    expect(skeleton.count).toBeGreaterThan(0);

    const progress: number[][] = [];
    const mesh = await p.build(params(), {
      mesher: 'hybrid',
      onProgress: (done, total) => progress.push([done, total]),
    });
    expect(mesh).not.toBeNull();
    expectWatertight(mesh!);
    const [done, total] = progress.at(-1)!;
    expect(done).toBe(total);
  });

  it('measures the path distances of a mesh and its skeletons on worker 0', async () => {
    const p = pool(2);
    const { skeleton } = await p.load(BRANCHED);
    let processed = skeleton;
    const mesh = (await p.build(params(), {
      mesher: 'hybrid',
      onPlanned: (s) => {
        processed = s;
      },
    }))!;

    const d = await p.distances({
      mesh: { positions: mesh.positions, types: mesh.vertexTypes },
      original: skeleton,
      processed,
    });
    expect(d.max).toBeCloseTo(10 + Math.hypot(10, 5) + Math.hypot(10, 3));
    expect(d.mesh).toHaveLength(mesh.vertexTypes.length);
    expect(d.original).toHaveLength(skeleton.count);
    expect(d.processed).toHaveLength(processed.count);
    expect(d.mesh!.every((x) => x >= 0 && x <= d.max)).toBe(true);
    // Nothing was handed over: the viewer still draws these.
    expect(mesh.positions.length).toBeGreaterThan(0);
    expect(skeleton.positions.length).toBeGreaterThan(0);
  });

  it('resolves a superseded build to null', async () => {
    const p = pool(2);
    await p.load(BRANCHED);
    const first = p.build(params(), { mesher: 'hybrid' });
    const second = p.build(params(), { mesher: 'hybrid' });
    expect(await first).toBeNull();
    expect(await second).not.toBeNull();
  });

  it('resolves a cancelled build to null, and builds the next one', async () => {
    const p = pool(2);
    await p.load(BRANCHED);
    const cancelled = p.build(params(), { mesher: 'hybrid' });
    p.cancel();
    expect(await cancelled).toBeNull();
    expect(await p.build(params({ includeTypes: [2] }), { mesher: 'hybrid' })).not.toBeNull();
  });

  it('rethrows a worker GpuError as a GpuError', async () => {
    const p = pool(1);
    await p.load(BRANCHED);
    expect(await p.probeGpu()).toBeNull();
    await expect(p.build(params(), { backend: 'gpu' })).rejects.toBeInstanceOf(GpuError);
  });

  it('fails calls to a worker that dies instead of hanging', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const silent = new MessageChannel();
    const p = pool(1, () => asWorker(silent));
    const load = p.load(BRANCHED);
    silent.port1.dispatchEvent(new Event('error'));
    await expect(load).rejects.toThrow('mesher worker failed');
    await expect(p.build(params(), { mesher: 'hybrid' })).rejects.toThrow('mesher worker failed');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('building the voxel mesh instead'));
    warn.mockRestore();
  });

  it('settles a running build to null on dispose', async () => {
    const p = pool(2);
    await p.load(BRANCHED);
    const running = p.build(params(), { mesher: 'hybrid' });
    p.dispose();
    expect(await running).toBeNull();
    await expect(p.load(BRANCHED)).rejects.toThrow('mesher pool disposed');
  });
});
