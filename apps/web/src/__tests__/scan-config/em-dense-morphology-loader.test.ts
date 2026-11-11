import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMEModels } from '@/api/entitycore/queries';
import { searchDerivations } from '@/api/entitycore/queries/general/derivation';

import { buildMemodelLoader } from '../../features/scan-config/workflow/loaders/em-dense-morphology-loader';

import type { TBrowsePrerequisiteValue } from '@/ui/segments/workflows/browse/browse-config';

vi.mock('@/api/entitycore/queries', () => ({ getMEModels: vi.fn() }));
vi.mock('@/api/entitycore/queries/experimental/cell-morphology', () => ({
  getCellMorphologies: vi.fn(),
}));
vi.mock('@/api/entitycore/queries/general/derivation', () => ({
  searchDerivations: vi.fn(),
}));

const prerequisite = { id: 'ds-1' } as TBrowsePrerequisiteValue;
const context = { virtualLabId: 'vl', projectId: 'p' };
const DERIVATION_TYPE = 'em_dense_reconstruction_dataset_cell_morphology';
const memodelResponse = {
  data: Array.from({ length: 5 }, (_, i) => ({ id: `me${i}` })),
  pagination: { page: 1, page_size: 30, total_items: 5 },
  facets: {},
};

const mockedMEModels = vi.mocked(getMEModels);

const run = (filters: Record<string, unknown>, withFacets?: boolean) =>
  buildMemodelLoader(prerequisite)({ filters, withFacets, context });

describe('buildMemodelLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedMEModels.mockResolvedValue(memodelResponse as never);
  });

  it('makes one /memodel request sized by the grid and returns its response as is', async () => {
    const res = await run({ page: 1, page_size: 30 });
    expect(mockedMEModels).toHaveBeenCalledTimes(1);
    expect(mockedMEModels.mock.calls[0][0].filters?.page_size).toBe(30);
    expect(res).toBe(memodelResponse);
    expect(vi.mocked(searchDerivations)).not.toHaveBeenCalled();
  });

  it('forwards grid filters and withFacets, and pins the dataset derivation filters', async () => {
    await run(
      {
        page: 2,
        page_size: 30,
        search: 'abc',
        mtype__id: 'x',
        morphology__generated_derivation__used_id: 'evil',
        morphology__generated_derivation__derivation_type: 'evil',
      },
      true
    );
    const call = mockedMEModels.mock.calls[0][0];
    expect(call.withFacets).toBe(true);
    expect(call.filters).toMatchObject({
      page: 2,
      search: 'abc',
      mtype__id: 'x',
    });
    expect(call.filters?.morphology__generated_derivation__used_id).toBe('ds-1');
    expect(call.filters?.morphology__generated_derivation__derivation_type).toBe(DERIVATION_TYPE);
  });

  it('does nothing without a prerequisite', async () => {
    expect(await buildMemodelLoader(null)({ filters: {}, context })).toBeUndefined();
    expect(mockedMEModels).not.toHaveBeenCalled();
  });
});
