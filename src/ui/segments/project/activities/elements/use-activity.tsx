'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { getPersons } from '@/api/entitycore/queries/general/person-agent';
import { keyBuilder as userKeyBuilder } from '@/ui/use-query-keys/user';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  ACTIVITY_PAGE_SIZE,
  type ActivityType,
} from '@/ui/segments/project/activities/elements/helpers';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

type QueryKey = WorkspaceContext & {
  page: number;
  pageSize: number;
  scale: TExtendedEntitiesTypeDict;
  type: 'build' | 'simulate';
};

export function useQueryActivity({
  scale,
  type,
  entity,
  page,
}: {
  scale: TExtendedEntitiesTypeDict;
  type: ActivityType;
  entity?: EntityCoreTypeConfig<any>;
  page: number;
}) {
  const session = useSession();
  const { virtualLabId, projectId } = useWorkspace();

  const { data: person } = useQuery({
    queryKey: userKeyBuilder.person({ userId: session.data?.user.id }),
    queryFn: () => getPersons({ filters: { sub_id: session.data?.user.id } }),
    enabled: Boolean(session.data?.user.id),
  });

  return useQuery<EntityCoreResponse<any> | null, Error>({
    queryKey: keyBuilder.activities({
      virtualLabId,
      projectId,
      scale,
      type,
      page,
      pageSize: ACTIVITY_PAGE_SIZE,
      entity: entity?.extendedType,
    }),
    queryFn: async ({ queryKey }) => {
      const queryKeyObject = queryKey.at(1) as QueryKey;
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
    enabled: Boolean(type && scale) && Boolean(person?.data.at(0)?.id),
  });
}
