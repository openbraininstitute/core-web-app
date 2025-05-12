import { useSessionStorage } from '@/hooks/useSessionStorage';

import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';

export const useBuildMeModelSessionState = ({
  stateId,
  virtualLabId,
  projectId,
}: {
  stateId: string;
  virtualLabId: string;
  projectId: string;
}) => {
  const { setSessionValue, removeSessionValue, sessionValue } = useSessionStorage<{
    virtualLabId: string;
    projectId: string;
    name?: string;
    description?: string;
    brainRegion?: BrainRegionHierarchyBase;
    mmodel?: IReconstructionMorphology;
    emodel?: IEModel;
  }>(stateId, {
    virtualLabId,
    projectId,
  });

  return {
    setSessionValue,
    removeSessionValue,
    sessionValue,
  };
};
