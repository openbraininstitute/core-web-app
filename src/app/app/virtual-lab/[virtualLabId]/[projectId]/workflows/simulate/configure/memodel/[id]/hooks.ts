import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import React from 'react';

import { getMEModel } from '@/api/entitycore/queries';
import { query } from '@/components/documentation/query/features-item-hooks.groq';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { IMEModel } from '@/api/entitycore/types';

export function useEntity(
  params: Promise<
    {
      virtualLabId: string;
      projectId: string;
    } & {
      id: string;
    }
  >
) {
  const [entity, setEntity] = React.useState<IMEModel | null | undefined>(undefined);
  const { virtualLabId, projectId, id: entityId } = React.use(params);
  const queryClient = useQueryClient();
  const queryKey = keyBuilder.meModel({ virtualLabId, projectId, entityId });
  const { data } = useSuspenseQuery({
    queryKey,
    queryFn: async () => {
      const result = await getMEModel({ id: entityId, context: { virtualLabId, projectId } });
      if (!result) throw new Error('ME-Model not found!');

      return result;
    },
    retry: 2,
  });
  React.useEffect(() => {
    setEntity(data);
    if (!data) {
      queryClient.invalidateQueries({ queryKey });
    }
  }, [data, queryKey, queryClient]);
  return entity;
}
