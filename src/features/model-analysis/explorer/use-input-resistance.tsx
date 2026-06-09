import { useQuery } from '@tanstack/react-query';

import { getMEModel } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';

export function useInputResistance({ entity }: { entity: TRetrieveEntityOutput }) {
  const { projectId, virtualLabId } = useWorkspace();
  const { isLoading, error, data } = useQuery({
    queryKey: keyBuilder.meModel({ projectId, virtualLabId, entityId: entity.id }),
    queryFn: async () => {
      const model = await getMEModel({ context: { projectId, virtualLabId }, id: entity.id });
      if (!model) throw new Error('ME-Model not found!');

      return model.calibration_result?.rin;
    },
    retry: 2,
    enabled: entity.type === EntityTypeDict.Memodel,
  });

  return { data, isLoading, error };
}
