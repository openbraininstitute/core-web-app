import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_PAGE_SIZE } from '@/utils/pagination';

import { ensureBrainRegionAtlasData } from './queries';

const mocks = vi.hoisted(() => ({
  callCount: { value: 0 },
}));

vi.mock('@/api/entitycore/queries/general/brain-atlas', () => ({
  getBrainAtlasRegions: async ({
    filters,
  }: {
    filters?: { page?: number; page_size?: number };
  }) => {
    mocks.callCount.value += 1;

    if (filters?.page === 1) {
      return {
        data: Array.from({ length: DEFAULT_PAGE_SIZE }, (_, index) => ({
          id: `region-${index + 1}`,
          brain_region_id: `brain-region-${index + 1}`,
          assets: [],
        })),
      };
    }

    if (filters?.page === 2) {
      return {
        data: [{ id: 'region-201', brain_region_id: 'brain-region-201', assets: [] }],
      };
    }

    throw new Error(`Unexpected page ${filters?.page}`);
  },
}));

describe('brain atlas region query', () => {
  it('deduplicates concurrent atlas region pagination through ensureQueryData', async () => {
    mocks.callCount.value = 0;

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const [first, second] = await Promise.all([
      ensureBrainRegionAtlasData(queryClient, 'atlas-1'),
      ensureBrainRegionAtlasData(queryClient, 'atlas-1'),
    ]);

    expect(mocks.callCount.value).toBe(2);
    expect(first.data.length).toBe(DEFAULT_PAGE_SIZE + 1);
    expect(first).toEqual(second);
  });
});
