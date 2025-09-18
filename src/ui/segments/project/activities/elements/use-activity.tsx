'use client';

import { hashKey, keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { getPersons } from '@/api/entitycore/queries/general/person-agent';
import { keyBuilder as userKeyBuilder } from '@/ui/use-query-keys/user';
import { ACTIVITY_DEFAULT_PAGE_SIZE } from '@/ui/segments/project/activities/elements/helpers';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';
import type { WorkspaceContext } from '@/types/common';

type QueryKey = WorkspaceContext & {
  page: number;
  pageSize: number;
  entityType: TExtendedEntitiesTypeDict;
  activity: TActivityValue;
};

export function useQueryActivity({
  selectionType,
  activity,
  entityType,
  page,
  pageSize = ACTIVITY_DEFAULT_PAGE_SIZE,
  useKeepPreviousData = false,
}: {
  selectionType: TExtendedEntitiesTypeDict;
  activity: TActivityValue;
  entityType: TExtendedEntitiesTypeDict;
  page: number;
  pageSize?: number;
  useKeepPreviousData?: boolean;
}) {
  const session = useSession();
  const { virtualLabId, projectId } = useWorkspace();

  const { data: person, isLoading: isPersonLoading } = useQuery({
    queryKey: userKeyBuilder.person({ userId: session.data?.user.id }),
    queryFn: () => getPersons({ filters: { sub_id: session.data?.user.id } }),
    enabled: Boolean(session.data?.user.id),
  });

  const queryKey = keyBuilder.activities({
    virtualLabId,
    projectId,
    selectionType,
    activity,
    page,
    pageSize,
    entityType,
  });

  const entity = getEntityByExtendedType({ type: entityType });
  const result = useQuery<EntityCoreResponse<any> | null, Error>({
    queryKey,
    queryFn: async ({ queryKey: _queryKey }) => {
      const queryKeyObject = _queryKey.at(1) as QueryKey;
      if (entity?.api.query?.list) {
        return entity.api.query.list({
          withFacets: false,
          context: { virtualLabId, projectId },
          filters: {
            page: queryKeyObject.page,
            page_size: queryKeyObject.pageSize,
            created_by__id: person?.data.at(0)?.id,
          },
        });
      }
      return Promise.resolve(null);
    },
    placeholderData: useKeepPreviousData ? keepPreviousData : undefined,
    enabled: Boolean(entityType && activity) && Boolean(person?.data.at(0)?.id),
  });

  const queryKeyHash = hashKey(queryKey);

  return {
    ...result,
    queryKeyHash,
    isDependenciesLoading: isPersonLoading,
    isQueryEnabled: Boolean(entityType && activity) && Boolean(person?.data.at(0)?.id),
  };
}
