import type { WorkspaceContext } from '@/types/common';
import type { TWorkspaceScope } from '@/constants';
import { TDerivationType } from '@/api/entitycore/types/entities/derivation';

const prefix = 'explore-data';

export const keyBuilder = {
  dataCount: ({
    virtualLabId,
    projectId,
    brainRegionId,
    personId,
    scope,
  }: WorkspaceContext & { brainRegionId?: string; personId?: string; scope: TWorkspaceScope }) => [
    `${prefix}-count`,
    { virtualLabId, projectId, brainRegionId: brainRegionId ?? '', personId, scope },
  ],
  userSimulationsCount: ({
    virtualLabId,
    projectId,
    brainRegionId,
    personId,
    scope,
  }: WorkspaceContext & { brainRegionId?: string; personId?: string; scope: TWorkspaceScope }) => [
    `${prefix}-simulations-count`,
    {
      virtualLabId,
      projectId,
      brainRegionId: brainRegionId ?? '',
      personId: personId ?? '',
      scope,
    },
  ],
  electricalCellRecordingsCount: ({
    virtualLabId,
    projectId,
    brainRegionId,
  }: WorkspaceContext & { brainRegionId?: string }) => [
    `${prefix}-electrical-cell-recordings-count`,
    { virtualLabId, projectId, brainRegionId: brainRegionId ?? '' },
  ],

  meModel: ({ virtualLabId, projectId, entityId }: WorkspaceContext & { entityId: string }) => [
    `${prefix}-single-neuron-model`,
    { virtualLabId, projectId, entityId },
  ],
  synaptome: ({ virtualLabId, projectId, entityId }: WorkspaceContext & { entityId: string }) => [
    `${prefix}-single-neuron-synaptome-model`,
    { virtualLabId, projectId, entityId },
  ],
  synaptomeConfiguration: ({
    virtualLabId,
    projectId,
    entityId,
  }: WorkspaceContext & { entityId: string }) => [
    `${prefix}-single-neuron-synaptome-configuration`,
    { virtualLabId, projectId, entityId },
  ],
  stimulationProtocolPreview: ({
    virtualLabId,
    projectId,
    memodelId,
    amplitudes,
    protocol,
  }: WorkspaceContext & { memodelId: string; amplitudes: string; protocol: string }) => [
    `${prefix}-stimuli-protocol-plot-data`,
    { virtualLabId, projectId, memodelId, amplitudes, protocol },
  ],
  circuitsByDerivationTree: ({
    virtualLabId,
    projectId,
    derivationType,
  }: WorkspaceContext & { derivationType: TDerivationType }) => [
    `${prefix}-circuit-derivation`,
    { virtualLabId, projectId, derivationType },
  ],
  fullCircuitHierarchy: ({ virtualLabId, projectId }: WorkspaceContext) => [
    `${prefix}-full-circuit-hierarchy`,
    { virtualLabId, projectId },
  ],
  manyCircuits: ({
    virtualLabId,
    projectId,
    page,
    page_size,
    ...props
  }: WorkspaceContext & { page: number; page_size: number } & Record<string, any>) => [
    `${prefix}-many-circuits`,
    { virtualLabId, projectId, page, page_size, ...props },
  ],
  circuitConfigAndDirectory: ({
    entityId,
    assetId,
    assetPath,
    context,
  }: {
    entityId: string;
    assetId: string;
    assetPath: string;
    context: WorkspaceContext;
  }) => [`${prefix}-circuit-config-and-directory`, { entityId, assetId, assetPath, ...context }],
};
