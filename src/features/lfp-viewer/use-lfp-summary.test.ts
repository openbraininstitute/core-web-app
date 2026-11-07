import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LfpSummaryChangedError } from './summary';
import { answeringRanges, deflated } from './test-ranges';
import {
  askStatusIfChanged,
  hasStoredCorrelation,
  MAX_ROW_READS,
  overRowLimit,
  rowQuery,
  statsFromOverview,
  statusKey,
} from './use-lfp-summary';

import type {
  LfpSummarySource,
  LfpSummaryStatus,
} from '@/api/small-scale-simulator/simulation-result/lfp-summary';
import type { WorkspaceContext } from '@/types/common';
import type { LfpAxis, LfpSummaryIndex } from './summary';
import type { ChosenField } from './use-lfp-summary';

vi.mock('@/api/small-scale-simulator/simulation-result/lfp-summary', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  buildLfpSummaryRequest: async () => ({ url: 'u', headers: {} }),
}));

const source: LfpSummarySource = {
  ctx: {} as WorkspaceContext,
  resultId: 'result',
  assetId: 'asset',
};
const ready = (sha256: string): LfpSummaryStatus =>
  ({ state: 'ready', sha256, size: 1 }) as LfpSummaryStatus;

function watchedStatus(first: LfpSummaryStatus, next: () => Promise<LfpSummaryStatus>) {
  const queryClient = new QueryClient();
  const queryFn = vi.fn(next);
  queryClient.setQueryData(statusKey(source), first);
  const observer = new QueryObserver(queryClient, {
    queryKey: statusKey(source),
    queryFn,
    staleTime: Infinity,
  });
  const stop = observer.subscribe(() => {});
  return { queryClient, queryFn, stop };
}

function failRead(
  queryClient: QueryClient,
  sha256: string,
  error: unknown = new LfpSummaryChangedError()
) {
  expect(() => askStatusIfChanged(queryClient, source, sha256)(error)).toThrow();
}

function chosenField(
  kind: ChosenField['field']['kind'],
  groups: number[],
  spectra: ChosenField['spectra'] = null
) {
  return { choice: { axis: 1, groups }, field: { kind }, spectra } as unknown as ChosenField;
}

describe('statsFromOverview', () => {
  const spectra = { frequencies: [1], psd: new Float32Array(1) };

  it('is so for groups added up over an overview of means', () => {
    expect(statsFromOverview(chosenField('mean', [0, 1]))).toBe(true);
  });

  it('is not so where the overview holds every step', () => {
    expect(statsFromOverview(chosenField('value', [0, 1]))).toBe(false);
  });

  it('is not so where the stats were stored at full resolution', () => {
    expect(statsFromOverview(chosenField('mean', [0], spectra))).toBe(false);
  });
});

describe('hasStoredCorrelation', () => {
  const index = {
    axes: [{ correlation: { dataset: 'c', scale: 1 } }, {}],
  } as unknown as LfpSummaryIndex;

  it('goes by the axis, for one group', () => {
    expect(hasStoredCorrelation(index, { axis: 0, groups: [0] })).toBe(true);
    expect(hasStoredCorrelation(index, { axis: 1, groups: [0] })).toBe(false);
  });

  it('is not so for groups added up', () => {
    expect(hasStoredCorrelation(index, { axis: 0, groups: [0, 1] })).toBe(false);
  });
});

describe('overRowLimit', () => {
  it('counts a row per contact per group', () => {
    expect(overRowLimit(chosenField('mean', [0]), MAX_ROW_READS)).toBe(false);
    expect(overRowLimit(chosenField('mean', [0, 1]), MAX_ROW_READS / 2)).toBe(false);
    expect(overRowLimit(chosenField('mean', [0, 1]), MAX_ROW_READS / 2 + 1)).toBe(true);
  });

  it('never holds where the overview already has every step', () => {
    expect(overRowLimit(chosenField('value', [0, 1, 2]), MAX_ROW_READS)).toBe(false);
  });
});

describe('askStatusIfChanged', () => {
  it('asks once while every row of the old summary fails at the same time', async () => {
    let answer: (status: LfpSummaryStatus) => void = () => {};
    const { queryClient, queryFn, stop } = watchedStatus(
      ready('old'),
      () =>
        new Promise((resolve) => {
          answer = resolve;
        })
    );

    for (let row = 0; row < 16; row++) failRead(queryClient, 'old');
    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
    for (let row = 0; row < 16; row++) failRead(queryClient, 'old');
    answer(ready('new'));
    await vi.waitFor(() =>
      expect(queryClient.getQueryData(statusKey(source))).toEqual(ready('new'))
    );

    expect(queryFn).toHaveBeenCalledTimes(1);
    stop();
  });

  it('does not ask again for a late read of a summary the status has moved on from', async () => {
    const { queryClient, queryFn, stop } = watchedStatus(ready('new'), async () => ready('new'));

    failRead(queryClient, 'old');
    await Promise.resolve();

    expect(queryFn).not.toHaveBeenCalled();
    stop();
  });

  it('does not ask for any other failure', async () => {
    const { queryClient, queryFn, stop } = watchedStatus(ready('old'), async () => ready('old'));

    failRead(queryClient, 'old', new Error('the network'));
    await Promise.resolve();

    expect(queryFn).not.toHaveBeenCalled();
    stop();
  });
});

describe('rowQuery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the rows asked for at one moment in one request, after their chunk table', async () => {
    // The first contact's block stored as its residuals, 1 and 2 less 1
    const rows = [
      [1, 1],
      [3, 4],
      [5, 6],
    ].map((values) => new Uint8Array(deflated(values)));
    // The table (1 group, 3 contacts, a block each, offset and size), the block scales and the
    // orders of prediction first, the rows apart from each other
    const offsets = [100, 200, 300];
    const file = new Uint8Array(400);
    const table = new BigUint64Array(6);
    rows.forEach((row, c) => {
      file.set(row, offsets[c]);
      table[c * 2] = BigInt(offsets[c]);
      table[c * 2 + 1] = BigInt(row.length);
    });
    file.set(new Uint8Array(table.buffer), 0);
    // The third contact's block at twice the group's scale
    file.set(new Uint8Array(Float32Array.from([0.5, 0.5, 1]).buffer), 48);
    file.set([1, 0, 0], 64);
    const fetchMock = vi.fn(answeringRanges(file));
    vi.stubGlobal('fetch', fetchMock);
    const axis = {
      name: 'mtype',
      scales: [0.5],
      levels: [
        {
          step: 1,
          kind: 'value',
          dataset: '/l0',
          blocks: {
            chunks: '/lfp/mtype/chunks',
            steps: 2,
            scales: '/lfp/mtype/block_scales',
            predictors: '/lfp/mtype/block_predictors',
          },
        },
      ],
    } as unknown as LfpAxis;
    const index = {
      contacts: 3,
      time: { start: 0, dt: 0.1, steps: 2 },
      datasets: {
        '/lfp/mtype/chunks': { offset: 0, shape: [1, 3, 1, 2], dtype: '<u8' },
        '/lfp/mtype/block_scales': { offset: 48, shape: [1, 3, 1], dtype: '<f4' },
        '/lfp/mtype/block_predictors': { offset: 64, shape: [1, 3, 1], dtype: '|u1' },
      },
    } as unknown as LfpSummaryIndex;
    const queryClient = new QueryClient();
    const at = { queryClient, source, sha256: 'a', index, axis };

    const read = await Promise.all(
      [2, 0, 1].map((contact) => queryClient.fetchQuery(rowQuery(at, 0, contact)))
    );

    expect(read.map((row) => Array.from(row))).toEqual([
      [10, 12],
      [1, 2],
      [3, 4],
    ]);
    // The table, the scales and the orders, then every row at once
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
