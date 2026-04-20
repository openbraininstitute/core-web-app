import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSpecies: vi.fn(),
  getBrainRegionHierarchies: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/general/species', () => ({
  getSpecies: mocks.getSpecies,
}));

vi.mock('@/api/entitycore/queries/general/brain-region', async () => {
  const actual = await vi.importActual<
    typeof import('@/api/entitycore/queries/general/brain-region')
  >('@/api/entitycore/queries/general/brain-region');

  return {
    ...actual,
    getBrainRegionHierarchies: mocks.getBrainRegionHierarchies,
  };
});

import { createCommonEntityImportQueryServices } from '@/features/entity-import/core/shared/common-query-services';

describe('createCommonEntityImportQueryServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps all species visible but disables those without any brain region hierarchy', async () => {
    mocks.getSpecies.mockResolvedValue({
      data: [
        { id: 'species-mouse', name: 'Mouse' },
        { id: 'species-human', name: 'Human' },
      ],
      pagination: {
        page: 1,
        page_size: 100,
        total_items: 2,
      },
    });
    mocks.getBrainRegionHierarchies.mockResolvedValue({
      data: [
        {
          id: 'hierarchy-mouse',
          name: 'Mouse hierarchy',
          species: {
            id: 'species-mouse',
            name: 'Mouse',
          },
        },
      ],
      pagination: {
        page: 1,
        page_size: 100,
        total_items: 1,
      },
    });

    const services = createCommonEntityImportQueryServices();

    await expect(
      services.querySpecies({
        context: { projectId: 'project-1', virtualLabId: 'lab-1' },
      })
    ).resolves.toEqual([
      {
        value: 'species-mouse',
        label: 'Mouse',
        description: undefined,
        metadata: {
          disabled: false,
        },
      },
      {
        value: 'species-human',
        label: 'Human',
        description: undefined,
        metadata: {
          disabled: true,
        },
      },
    ]);
  });

  it('uses species_id__in when list hierarchies omit species until a filtered fetch', async () => {
    mocks.getSpecies.mockResolvedValue({
      data: [
        { id: 'species-a', name: 'Aye-aye' },
        { id: 'species-b', name: 'Bonobo' },
      ],
      pagination: { page: 1, page_size: 100, total_items: 2 },
    });

    mocks.getBrainRegionHierarchies.mockImplementation(
      async ({
        filters,
      }: {
        filters?: { species_id__in?: string[]; page?: number; page_size?: number };
      }) => {
        if (filters?.species_id__in?.length) {
          expect(filters.species_id__in).toEqual(['species-a', 'species-b']);
          return {
            data: [
              {
                id: 'h-a',
                name: 'Hierarchy A',
                species: { id: 'species-a', name: 'Aye-aye' },
              },
            ],
            pagination: { page: 1, page_size: 100, total_items: 1 },
          };
        }

        return {
          data: [{ id: 'h-unknown', name: 'Hierarchy without species field' }],
          pagination: { page: 1, page_size: 100, total_items: 1 },
        };
      }
    );

    const services = createCommonEntityImportQueryServices();
    await expect(
      services.querySpecies({ context: { projectId: 'project-1', virtualLabId: 'lab-1' } })
    ).resolves.toEqual([
      {
        value: 'species-a',
        label: 'Aye-aye',
        description: undefined,
        metadata: { disabled: false },
      },
      {
        value: 'species-b',
        label: 'Bonobo',
        description: undefined,
        metadata: { disabled: true },
      },
    ]);
  });

  it('keeps all species visible when hierarchy lookup fails', async () => {
    mocks.getSpecies.mockResolvedValue({
      data: [
        { id: 'species-mouse', name: 'Mouse' },
        { id: 'species-human', name: 'Human' },
      ],
      pagination: { page: 1, page_size: 100, total_items: 2 },
    });
    mocks.getBrainRegionHierarchies.mockRejectedValue(new Error('hierarchy lookup failed'));

    const services = createCommonEntityImportQueryServices();

    await expect(
      services.querySpecies({ context: { projectId: 'project-1', virtualLabId: 'lab-1' } })
    ).resolves.toEqual([
      {
        value: 'species-human',
        label: 'Human',
        description: undefined,
        metadata: { disabled: false },
      },
      {
        value: 'species-mouse',
        label: 'Mouse',
        description: undefined,
        metadata: { disabled: false },
      },
    ]);
  });
});
