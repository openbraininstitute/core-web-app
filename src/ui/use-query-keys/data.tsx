import { WorkspaceContext } from '@/types/common';

const prefix = 'explore-data';

export const keyBuilder = {
  dataCount: ({
    virtualLabId,
    projectId,
    brainRegionId,
  }: WorkspaceContext & { brainRegionId?: string }) => [
    `${prefix}-count`,
    { virtualLabId, projectId, brainRegionId: brainRegionId ?? '' },
  ],
  electricalCellRecordingsCount: ({
    virtualLabId,
    projectId,
    brainRegionId,
  }: WorkspaceContext & { brainRegionId?: string }) => [
    `${prefix}-electrical-cell-recordings-count`,
    { virtualLabId, projectId, brainRegionId: brainRegionId ?? '' },
  ],
};
