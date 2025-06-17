import { atomFamily } from 'jotai/utils';
import { atom } from 'jotai';
import head from 'lodash/head';

import { getValidationResults } from '@/api/entitycore/queries/general/validation-result';
import { getAssets } from '@/api/entitycore/queries/assets';
import { tryCatch } from '@/api/utils';

import type { WorkspaceContext } from '@/types/common';

export const validationResultAtom = atomFamily(
  (ctx: { workspace: WorkspaceContext; id: string }) => {
    const childAtom = atom(async (get) => {
      const { data: entities, error } = await tryCatch(
        getValidationResults({
          context: ctx.workspace,
          filters: { validated_entity_id: ctx.id },
        })
      );
      if (error) {
        throw error;
      }

      const entity = head(entities.data);
      if (entity) {
        const assets = await getAssets({
          ctx: ctx.workspace,
          // @ts-expect-error
          entityType: 'validation-result',
          entityId: entity.id,
        });
        return {
          entity,
          assets: assets.data,
        };
      }
      throw new Error(
        `No validation result found for entity with ID "${ctx.id}" in this workspace`
      );
    });

    childAtom.debugLabel = `validation-result-atom/${ctx.id}`;
    return childAtom;
  }
);
