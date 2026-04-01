import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const getRoles = vi.fn();
  const entityCoreGet = vi.fn();
  const entityCoreApi = vi.fn(async () => ({ get: entityCoreGet }));
  const getEntityCoreContext = vi.fn((context) =>
    context
      ? {
          headers: {
            'project-id': context.projectId,
            'virtual-lab-id': context.virtualLabId,
          },
        }
      : {}
  );

  return {
    getRoles,
    entityCoreGet,
    entityCoreApi,
    getEntityCoreContext,
  };
});

vi.mock('@/api/entitycore/queries/general/role', () => ({
  getRoles: mocks.getRoles,
}));

vi.mock('@/api/entitycore/utils', () => ({
  entityCoreApi: mocks.entityCoreApi,
  getEntityCoreContext: mocks.getEntityCoreContext,
}));

import { createCellMorphologyImportServices } from '@/ui/segments/contribute/multiple/adapters/cell-morphology/services';

describe('createCellMorphologyImportServices query helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queryRole forwards page, page_size, and query to the paginated role endpoint', async () => {
    mocks.getRoles.mockResolvedValue({
      data: Array.from({ length: 5 }, (_, index) => ({
        id: `role-${index + 1}`,
        name: `Role ${index + 1}`,
      })),
      pagination: {
        page: 1,
        page_size: 5,
        total_items: 9,
      },
    });

    const services = createCellMorphologyImportServices() as {
      queryRole: (args: {
        query: string;
        queryField: 'query';
        context: { projectId: string; virtualLabId: string };
        pageParam: number;
        pageSize: number;
      }) => Promise<{
        suggestions: Array<{ value: string; label: string }>;
        nextPageParam: number | null;
      }>;
    };

    await expect(
      services.queryRole({
        query: 'author',
        queryField: 'query',
        context: { projectId: 'project-1', virtualLabId: 'lab-1' },
        pageParam: 0,
        pageSize: 5,
      })
    ).resolves.toEqual({
      suggestions: [
        { value: 'role-1', label: 'Role 1' },
        { value: 'role-2', label: 'Role 2' },
        { value: 'role-3', label: 'Role 3' },
        { value: 'role-4', label: 'Role 4' },
        { value: 'role-5', label: 'Role 5' },
      ],
      nextPageParam: 5,
    });

    expect(mocks.getRoles).toHaveBeenCalledWith({
      filters: {
        page: 1,
        page_size: 5,
        query: 'author',
      },
      context: {
        projectId: 'project-1',
        virtualLabId: 'lab-1',
      },
    });
  });

  it('queryBrainRegion forwards page, page_size, and the requested query field', async () => {
    mocks.entityCoreGet.mockResolvedValue({
      data: [
        { id: 'brain-region-1', name: 'Isocortex', acronym: 'ISO' },
        { id: 'brain-region-2', name: 'Hippocampus', acronym: 'HIP' },
      ],
      pagination: {
        page: 2,
        page_size: 2,
        total_items: 4,
      },
    });

    const services = createCellMorphologyImportServices() as {
      queryBrainRegion: (args: {
        query: string;
        queryField: 'semantic_search';
        context: { projectId: string; virtualLabId: string };
        pageParam: number;
        pageSize: number;
      }) => Promise<{
        suggestions: Array<{
          value: string;
          label: string;
          description?: string;
          metadata?: { acronym?: string };
        }>;
        nextPageParam: number | null;
      }>;
    };

    await expect(
      services.queryBrainRegion({
        query: 'iso',
        queryField: 'semantic_search',
        context: { projectId: 'project-1', virtualLabId: 'lab-1' },
        pageParam: 2,
        pageSize: 2,
      })
    ).resolves.toEqual({
      suggestions: [
        {
          value: 'brain-region-1',
          label: 'Isocortex',
          description: 'ISO',
          metadata: { acronym: 'ISO', species: null, speciesId: null },
        },
        {
          value: 'brain-region-2',
          label: 'Hippocampus',
          description: 'HIP',
          metadata: { acronym: 'HIP', species: null, speciesId: null },
        },
      ],
      nextPageParam: null,
    });

    expect(mocks.entityCoreApi).toHaveBeenCalled();
    expect(mocks.entityCoreGet).toHaveBeenCalledWith('/brain-region', {
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'project-id': 'project-1',
        'virtual-lab-id': 'lab-1',
      },
      queryParams: {
        page: 2,
        page_size: 2,
        semantic_search: 'iso',
        species__id: null,
      },
    });
  });
});
