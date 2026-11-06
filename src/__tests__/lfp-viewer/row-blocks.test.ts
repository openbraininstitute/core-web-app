import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { answeringRanges, deflated } from '@/features/lfp-viewer/test-ranges';
import { rowQuery } from '@/features/lfp-viewer/use-lfp-summary';

import type { LfpSummarySource } from '@/api/small-scale-simulator/simulation-result/lfp-summary';
import type { LfpAxis, LfpSummaryIndex } from '@/features/lfp-viewer/summary';
import type { WorkspaceContext } from '@/types/common';

vi.mock('@/api/small-scale-simulator/simulation-result/lfp-summary', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  buildLfpSummaryRequest: async () => ({ url: 'u', headers: {} }),
}));

const source: LfpSummarySource = {
  ctx: {} as WorkspaceContext,
  resultId: 'result',
  assetId: 'asset',
};

describe('a whole row in blocks', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is its blocks one after another, each to the group’s scale, the padding left off', async () => {
    // 5 steps in blocks of 3: the second has 2 steps and a step of padding, at twice the scale
    const blocks = [deflated([1, 2, 3]), deflated([4, 5, 0])].map((b) => new Uint8Array(b));
    const offsets = [100, 200];
    const file = new Uint8Array(300);
    const table = new BigUint64Array(4);
    blocks.forEach((block, b) => {
      file.set(block, offsets[b]);
      table[b * 2] = BigInt(offsets[b]);
      table[b * 2 + 1] = BigInt(block.length);
    });
    file.set(new Uint8Array(table.buffer), 0);
    file.set(new Uint8Array(Float32Array.from([0.5, 1]).buffer), 40);
    const fetchMock = vi.fn(answeringRanges(file));
    vi.stubGlobal('fetch', fetchMock);
    const axis = {
      name: 'total',
      scales: [0.5],
      levels: [
        {
          step: 1,
          kind: 'value',
          dataset: '/lfp/total/rows',
          blocks: { chunks: '/lfp/total/chunks', steps: 3, scales: '/lfp/total/block_scales' },
        },
      ],
    } as unknown as LfpAxis;
    const index = {
      contacts: 1,
      time: { start: 0, dt: 0.1, steps: 5 },
      datasets: {
        '/lfp/total/chunks': { offset: 0, shape: [1, 1, 2, 2], dtype: '<u8' },
        '/lfp/total/block_scales': { offset: 40, shape: [1, 1, 2], dtype: '<f4' },
      },
    } as unknown as LfpSummaryIndex;
    const queryClient = new QueryClient();

    const row = await queryClient.fetchQuery(
      rowQuery({ queryClient, source, sha256: 'a', index, axis }, 0, 0)
    );

    expect(Array.from(row)).toEqual([1, 2, 3, 8, 10]);
    // The table and the scales, then both blocks at once
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
