import { useQuery } from '@tanstack/react-query';

import { getElectricalCellRecordings } from '@/api/entitycore/queries';
import type { WorkspaceContext } from '@/types/common';
import { keyBuilder } from '@/ui/use-query-keys/data';

export function useElectricalCellRecordingsByDerivations({
  virtualLabId,
  projectId,
  enabled,
  Ids,
}: WorkspaceContext & {
  enabled: boolean;
  Ids: string[];
}) {
  const {
    data: eModelExemplarTraces,
    isLoading: isLoadingExemplarTraces,
    error: errorExemplarTraces,
  } = useQuery({
    queryKey: keyBuilder.electricalCellRecordings({
      virtualLabId,
      projectId,
      id__in: Ids,
    }),
    queryFn: () => {
      return getElectricalCellRecordings({
        context: { virtualLabId, projectId },
        filters: { id__in: Ids },
        withFacets: false,
      });
    },
    enabled,
  });

  return {
    eModelExemplarTraces,
    isLoadingExemplarTraces,
    errorExemplarTraces,
  };
}
