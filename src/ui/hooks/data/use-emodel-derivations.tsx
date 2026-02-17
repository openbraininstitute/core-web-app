import { useQuery } from '@tanstack/react-query';
import kebabCase from 'es-toolkit/compat/kebabCase';

import { getEntityDerivations } from '@/api/entitycore/queries/general/derivation';
import { EntityTypeDict } from '@/api/entitycore/types';
import { DerivationTypeDictionary } from '@/api/entitycore/types/entities/derivation';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';
import type { NormalizeChars } from '@/utils/type';

export function useEmodelDerivations({
  entityId,
  virtualLabId,
  projectId,
  pageNumber,
  pageSize,
}: { entityId: string; pageNumber: number; pageSize: number } & WorkspaceContext) {
  const {
    data: derivations,
    isSuccess: isSuccessDerivations,
    isLoading,
    error,
  } = useQuery({
    queryKey: keyBuilder.derivations({
      virtualLabId,
      projectId,
      entityId,
      entityRoute: EntityTypeDict.Emodel,
      derivationType: DerivationTypeDictionary.Unspecified,
      page: pageNumber,
      pageSize,
    }),
    queryFn: () =>
      getEntityDerivations({
        context: { virtualLabId, projectId },
        entityId,
        entityRoute: kebabCase(EntityTypeDict.Emodel) as NormalizeChars<TEntityTypeDict>,
        filters: {
          derivation_type: DerivationTypeDictionary.Unspecified,
          page: pageNumber,
          page_size: pageSize,
        },
      }),
  });

  return {
    derivations,
    isLoading,
    isSuccessDerivations,
    error,
  };
}
