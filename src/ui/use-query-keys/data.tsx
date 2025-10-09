import type { IScientificArtifactPublicationLinkFilter } from '@/api/entitycore/types/entities/scientific-artifact-publication-link';
import type { ElectricalCellRecordingFilter } from '@/api/entitycore/types/entities/electrical-cell-recording';
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
  electricalCellRecordings: ({
    virtualLabId,
    projectId,
    brainRegionId,
    page,
    pageSize,
    ...props
  }: WorkspaceContext & {
    brainRegionId?: string;
    page?: number;
    pageSize?: number;
  } & ElectricalCellRecordingFilter) => [
    `${prefix}-electrical-cell-recordings`,
    { virtualLabId, projectId, brainRegionId: brainRegionId ?? '', page, pageSize, ...props },
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
  derivations: ({
    virtualLabId,
    projectId,
    entityId,
    entityRoute,
    derivationType,
    page,
    pageSize,
  }: WorkspaceContext & {
    entityId: string;
    entityRoute: TEntityTypeDict;
    derivationType: TDerivationType;
    page: number;
    pageSize: number;
  }) => [
    `${prefix}-derivations`,
    { virtualLabId, projectId, entityId, entityRoute, derivationType, page, pageSize },
  ],
  ionChannelsFile: ({ entityName }: { entityName: string }) => [
    `${prefix}-ion-channels-file`,
    { entityName },
  ],
  scientificArtifactPublicationLinks: ({
    context,
    ...props
  }: {
    context: WorkspaceContext;
    props: Partial<IScientificArtifactPublicationLinkFilter>;
  }) => [`${prefix}-scientific-artifact-publication-links`, { ...props, ...context }],
  circuitProperties: ({ circuitId }: { circuitId: string }) => {
    return [`${prefix}-circuit-properties`, circuitId];
  },
};
