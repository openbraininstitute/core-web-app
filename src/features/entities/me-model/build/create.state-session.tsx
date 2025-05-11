import { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import { IEModel } from '@/api/entitycore/types/entities/e-model';
import { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import { useSessionStorage } from '@/hooks/useSessionStorage';

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
    brainRegion?: Partial<IBrainRegionHierarchy>;
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
