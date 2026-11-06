import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { answeringRanges } from './test-ranges';
import { useChosenField } from './use-lfp-summary';

import type { ReactNode } from 'react';
import type { LfpSummarySource } from '@/api/small-scale-simulator/simulation-result/lfp-summary';
import type { WorkspaceContext } from '@/types/common';
import type { LfpField, LfpSummaryIndex } from './summary';
import type { FieldChoice, LfpSummary } from './use-lfp-summary';

vi.mock('@/api/small-scale-simulator/simulation-result/lfp-summary', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  buildLfpSummaryRequest: async () => ({ url: 'u', headers: {} }),
}));

const source: LfpSummarySource = {
  ctx: {} as WorkspaceContext,
  resultId: 'result',
  assetId: 'asset',
};

// Two groups of an axis over two contacts: their fields of 4 steps, one stat, two frequencies and
// their shares at each contact.
const file = new Uint8Array(256);
file.set(
  new Uint8Array(Int16Array.from([1, 2, 3, 4, 5, 6, 7, 8, 1, 1, 1, 1, 2, 2, 2, 2]).buffer),
  0
);
file.set(new Uint8Array(Float32Array.from([10, 20, 30, 40]).buffer), 64);
file.set(new Uint8Array(Float32Array.from([1, 2, 3, 4, 5, 6, 7, 8]).buffer), 128);
file.set(new Uint8Array(Float32Array.from([0.25, 0.5, 0.75, 0.5]).buffer), 192);

const index = {
  time: { start: 0, dt: 0.1, steps: 4 },
  contacts: 2,
  stats: ['rms'],
  axes: [
    { name: 'total', groups: ['total'], scales: [1], psd_frequencies: [1, 2] },
    {
      name: 'mtype',
      groups: ['A', 'B'],
      scales: [1, 1],
      shares: [0.4, 0.6],
      levels: [{ step: 1, kind: 'value', dataset: '/l0' }],
      stats: '/stats',
      psd: '/psd',
      psd_frequencies: [1, 2],
      contact_shares: '/shares',
    },
  ],
  datasets: {
    '/l0': { offset: 0, shape: [2, 2, 4], dtype: '<i2' },
    '/stats': { offset: 64, shape: [2, 2, 1], dtype: '<f4' },
    '/psd': { offset: 128, shape: [2, 2, 2], dtype: '<f4' },
    '/shares': { offset: 192, shape: [2, 2], dtype: '<f4' },
  },
} as unknown as LfpSummaryIndex;

const summaryOf = (sha256: string): LfpSummary => ({
  sha256,
  index,
  total: { contacts: 2, bins: 4, binMs: 0.1, start: 0, kind: 'value' } as LfpField,
  stats: new Float32Array(2),
  psd: new Float32Array(4),
});

function chosen(summary: LfpSummary, choice: FieldChoice) {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useChosenField(source, summary, choice), { wrapper }).result;
}

describe('useChosenField', () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads a group's field, stats, spectra and shares in one request", async () => {
    const fetchMock = vi.fn(answeringRanges(file));
    vi.stubGlobal('fetch', fetchMock);

    const result = chosen(summaryOf('one'), { axis: 1, groups: [1] });

    await waitFor(() => expect(result.current.loading).toBe(false));
    const { field, stats, spectra, shares } = result.current.chosen;
    expect(Array.from(field.data)).toEqual([1, 1, 1, 1, 2, 2, 2, 2]);
    expect(Array.from(stats)).toEqual([30, 40]);
    expect(Array.from(spectra?.psd ?? [])).toEqual([5, 6, 7, 8]);
    expect(Array.from(shares ?? [])).toEqual([0.75, 0.5]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('adds up the shares of the groups ticked', async () => {
    vi.stubGlobal('fetch', vi.fn(answeringRanges(file)));

    const result = chosen(summaryOf('two'), { axis: 1, groups: [0, 1] });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(Array.from(result.current.chosen.shares ?? [])).toEqual([1, 1]);
    expect(result.current.chosen.spectra).toBeNull();
  });

  it('has no shares for the total', () => {
    const result = chosen(summaryOf('three'), { axis: 0, groups: [0] });

    expect(result.current.chosen.shares).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
