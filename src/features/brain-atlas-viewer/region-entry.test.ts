import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Filters = { page?: number; page_size?: number; brain_region_id?: string };

const getBrainAtlasRegions = vi.hoisted(() => vi.fn());
vi.mock('@/api/entitycore/queries/general/brain-atlas', () => ({ getBrainAtlasRegions }));

import { ensureBrainAtlasRegionEntry, ensureBrainRegionAtlasData } from './queries';

describe('ensureBrainAtlasRegionEntry', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    getBrainAtlasRegions.mockReset();
    getBrainAtlasRegions.mockImplementation(async ({ filters }: { filters?: Filters }) => {
      if (filters?.brain_region_id === 'missing') return { data: [] };
      if (filters?.brain_region_id) {
        return { data: [{ id: 'entry', brain_region_id: filters.brain_region_id, assets: [] }] };
      }
      return { data: [{ id: 'full-entry', brain_region_id: 'in-full-atlas', assets: [] }] };
    });
  });

  it('requests only the wanted region and caches it', async () => {
    const [first, second] = await Promise.all([
      ensureBrainAtlasRegionEntry(queryClient, 'atlas-1', 'region-1'),
      ensureBrainAtlasRegionEntry(queryClient, 'atlas-1', 'region-1'),
    ]);

    expect(first?.brain_region_id).toBe('region-1');
    expect(second).toEqual(first);
    expect(getBrainAtlasRegions).toHaveBeenCalledTimes(1);
    expect(getBrainAtlasRegions).toHaveBeenCalledWith({
      atlasId: 'atlas-1',
      filters: { brain_region_id: 'region-1', page_size: 1 },
    });
  });

  it('returns null when the atlas has no entry for the region', async () => {
    await expect(
      ensureBrainAtlasRegionEntry(queryClient, 'atlas-1', 'missing')
    ).resolves.toBeNull();
  });

  it('reuses the full atlas when it is already loaded', async () => {
    await ensureBrainRegionAtlasData(queryClient, 'atlas-1');
    getBrainAtlasRegions.mockClear();

    const found = await ensureBrainAtlasRegionEntry(queryClient, 'atlas-1', 'in-full-atlas');
    const missing = await ensureBrainAtlasRegionEntry(queryClient, 'atlas-1', 'other');

    expect(found?.id).toBe('full-entry');
    expect(missing).toBeNull();
    expect(getBrainAtlasRegions).not.toHaveBeenCalled();
  });
});
