import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { LfpSummaryChangedError } from './summary';
import {
  askStatusIfChanged,
  MAX_ROW_READS,
  overRowLimit,
  statsFromOverview,
  statusKey,
} from './use-lfp-summary';

import type {
  LfpSummarySource,
  LfpSummaryStatus,
} from '@/api/small-scale-simulator/simulation-result/lfp-summary';
import type { WorkspaceContext } from '@/types/common';
import type { ChosenField } from './use-lfp-summary';

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
