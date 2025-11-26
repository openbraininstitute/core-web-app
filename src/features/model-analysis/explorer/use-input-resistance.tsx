import { useQuery } from '@tanstack/react-query';

import { getMEModel } from '@/api/entitycore/queries';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { useWorkspace } from '@/ui/hooks/use-workspace';

export function useInputResistance(entityId: string): number | undefined {
  const { projectId, virtualLabId } = useWorkspace();
  const { isPending, error, data } = useQuery({
    queryKey: keyBuilder.meModel({ projectId, virtualLabId, entityId }),
    queryFn: async () => {
      const model = await getMEModel({ context: { projectId, virtualLabId }, id: entityId });
      return model.calibration_result.rin;
    },
  });
  if (isPending || error) return undefined;
  return data;
}
