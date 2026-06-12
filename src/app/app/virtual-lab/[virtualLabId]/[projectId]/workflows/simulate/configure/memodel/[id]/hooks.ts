import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { getMEModel } from '@/api/entitycore/queries';
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
  const [entity, setEntity] = React.useState<IMEModel | Error | undefined>(undefined);
  const { virtualLabId, projectId, id: entityId } = React.use(params);
  const queryClient = useQueryClient();
  const queryKey = keyBuilder.meModel({ virtualLabId, projectId, entityId });
  console.log('🐞 [hooks@23] queryKey =', queryKey); // @FIXME: Remove this line written on 2026-06-12 at 14:16
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await getMEModel({
        id: entityId,
        context: { virtualLabId, projectId },
      });
      if (!result) throw new Error('ME-Model not found!');

      return result;
    },
    retry: 2,
  });
  React.useEffect(() => {
    if (isLoading) {
      setEntity(undefined);
      return;
    }
    if (error) {
      setEntity(error);
      return;
    }
    setEntity(data);
    if (!data) {
      queryClient.invalidateQueries({ queryKey });
    }
  }, [data, isLoading, error, queryKey, queryClient]);
  return entity;
}
