import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getEModel } from '@/api/entitycore/queries/model/e-model';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { retrieveEntity } from '@/entity-configuration/domain/requests';

// vi.mock is hoisted above the imports, so the spy must be hoisted with it
const h = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/api/entitycore/utils', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  entityCoreApi: async () => ({ get: h.get }),
}));

const ctx = { virtualLabId: 'lab-1', projectId: 'project-1' };

/** The `expand` query param of the single request made. */
function sentExpand() {
  expect(h.get).toHaveBeenCalledTimes(1);
  return h.get.mock.calls[0][1]?.queryParams?.expand;
}

describe('entitycore expand forwarding', () => {
  beforeEach(() => {
    h.get.mockReset();
    h.get.mockResolvedValue({ id: 'm-1' });
  });

  it("retrieveEntity sends the type's own entityExpand", async () => {
    await retrieveEntity({ type: ExtendedEntitiesTypeDict.CellMorphology, id: 'm-1', ctx });

    expect(sentExpand()).toEqual(['measurement_annotation']);
    expect(h.get.mock.calls[0][0]).toBe('/cell-morphology/m-1');
  });

  it('retrieveEntity sends no expand for a type without entityExpand', async () => {
    await retrieveEntity({ type: ExtendedEntitiesTypeDict.Emodel, id: 'e-1', ctx });

    expect(sentExpand()).toBeUndefined();
  });

  it('sends no expand when none is given', async () => {
    await getEModel({ id: 'e-1', context: ctx });

    expect(sentExpand()).toBeUndefined();
  });
});
