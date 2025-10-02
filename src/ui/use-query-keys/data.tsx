import type { TDerivationType } from '@/api/entitycore/types/entities/derivation';
import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';
import type { TWorkspaceScope } from '@/constants';

const prefix = 'data';

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
  asset: ({
    entityId,
    assetId,
    assetPath,
    assetType,
    context,
    asRawResponse,
  }: {
    entityId: string;
    assetId: string;
    assetPath?: string;
    assetType?: TEntityTypeDict;
    context?: WorkspaceContext;
    asRawResponse?: boolean;
  }) => [
    `${prefix}-entity-asset`,
    { entityId, assetId, assetPath, assetType, asRawResponse, ...context },
  ],
  simCampaign: ({ entityId }: { entityId: string }) => [`${prefix}-sim-campaign`, { entityId }],
  annotation: ({ entityId }: { entityId: string }) => [`${prefix}-annotation`, { entityId }],
  neuronMorphology3DData: ({
    virtualLabId,
    projectId,
    modelId,
  }: WorkspaceContext & { modelId: string }) => [
    `${prefix}-neuron-morphology-3d-data`,
    { virtualLabId, projectId, modelId },
  ],
  agents: ({ agentType }: { agentType: 'person' | 'organization' | 'consortium' }) => [
    `${prefix}-agents`,
    { agentType },
  ],
  roles: ({ roleType }: { roleType: 'contributor' | 'owner' | 'viewer' }) => [
    `${prefix}-roles`,
    { roleType },
  ],
};
