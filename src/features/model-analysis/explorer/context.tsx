import { atomFamily } from 'jotai/utils';
import { atom } from 'jotai';

import { getValidationResults } from '@/api/entitycore/queries/general/validation-result';
import { getAssets } from '@/api/entitycore/queries/assets';
import { tryCatch } from '@/api/utils';

import type { WorkspaceContext } from '@/types/common';

type AtomParams = {
  workspace?: WorkspaceContext;
  id: string;
};

async function resolveValidationResults({ id, workspace }: AtomParams) {
  const { data: entities, error } = await tryCatch(
    getValidationResults({
      context: workspace,
      filters: { validated_entity_id: id, page: 1, page_size: 10 },
    })
  );
  if (error) {
    throw error;
  }

  const results = await Promise.allSettled(
    entities.data.map((entity) => {
      return getAssets({
        ctx: workspace,
        // @ts-expect-error
        entityType: 'validation-result',
        entityId: entity.id,
      });
    })
  );

  const entitiesWithAssets = entities.data.map((entity, i) => {
    const result = results[i];
    return {
      ...entity,
      assets: result.status === 'fulfilled' ? result.value.data : null,
      error: result.status === 'rejected' ? result.reason : null,
    };
  });

  return entitiesWithAssets;
}

export type IValidationConstructedResult = Awaited<ReturnType<typeof resolveValidationResults>>;

export const validationResultAtom = atomFamily(({ id, workspace }: AtomParams) => {
  const childAtom = atom(async () => {
    if (!id) return null;
    return await resolveValidationResults({ id, workspace });
  });

  childAtom.debugLabel = `validation-result-atom/${id}`;
  return childAtom;
});
