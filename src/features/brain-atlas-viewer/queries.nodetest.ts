import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

describe('brain atlas region query', () => {
  it('deduplicates concurrent atlas region pagination through ensureQueryData', async () => {
    let calls = 0;

    mock.module('@/api/entitycore/queries/general/brain-atlas', {
      namedExports: {
        getBrainAtlasRegions: async ({
          filters,
        }: {
          filters?: { page?: number; page_size?: number };
        }) => {
          calls += 1;

          if (filters?.page === 1) {
            return {
              data: Array.from({ length: 200 }, (_, index) => ({
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
      },
    });

    const { QueryClient } = await import('@tanstack/react-query');
    const { ensureBrainRegionAtlasData } = await import('./queries');

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

    assert.equal(calls, 2);
    assert.equal(first.data.length, 201);
    assert.deepEqual(first, second);
  });
});
