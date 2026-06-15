import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { getMEModel } from '@/api/entitycore/queries';
import { keyBuilder } from '@/ui/use-query-keys/data';

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
  const { virtualLabId, projectId, id: entityId } = React.use(params);
  const queryKey = keyBuilder.meModel({ virtualLabId, projectId, entityId });
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
  if (isLoading) return undefined;

  if (error) return error;

  return data;
}
