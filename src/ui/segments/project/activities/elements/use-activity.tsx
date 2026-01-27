'use client';

import { hashKey, keepPreviousData, useQuery } from '@tanstack/react-query';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import type { WorkspaceContext } from '@/types/common';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { ACTIVITY_DEFAULT_PAGE_SIZE } from '@/ui/segments/project/activities/elements/helpers';
import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

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
  const { virtualLabId, projectId } = useWorkspace();

  const queryKey = keyBuilder.activities({
    virtualLabId,
    projectId,
    selectionType,
    activity,
    page,
    pageSize,
    entityType,
    authorizedPublic: false,
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
            authorized_project_id: projectId,
            authorized_public: false,
          },
        });
      }
      return Promise.resolve(null);
    },
    placeholderData: useKeepPreviousData ? keepPreviousData : undefined,
    enabled: Boolean(entityType && activity),
  });

  const queryKeyHash = hashKey(queryKey);

  return {
    ...result,
    queryKeyHash,
    isQueryEnabled: Boolean(entityType && activity),
  };
}
