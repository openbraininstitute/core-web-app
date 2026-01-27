import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TDerivationType } from '@/api/entitycore/types/entities/derivation';
import type { ElectricalCellRecordingFilter } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { IScientificArtifactPublicationLinkFilter } from '@/api/entitycore/types/entities/scientific-artifact-publication-link';
import type { ISingleNeuronSimulationFilter } from '@/api/entitycore/types/entities/single-neuron-simulation';
import type { ISingleNeuronSynaptomeSimulationFilter } from '@/api/entitycore/types/entities/single-neuron-synaptome-simulation';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IEMDenseReconstructionDatasetFilter } from '@/api/entitycore/types/shared/em-dense-reconstruction-dataset';
import type { IProtocolFilter } from '@/api/entitycore/types/shared/protocol';
import type { ISubjectFilter } from '@/api/entitycore/types/shared/subject';
import type { TWorkspaceScope } from '@/constants';
import type { WorkspaceContext } from '@/types/common';

const prefix = 'data';

export const keyBuilder = {
  dataCountPerEntity: ({
    virtualLabId,
    projectId,
    brainRegionId,
    extendedEntityType,
    scope,
  }: WorkspaceContext & {
    brainRegionId?: string;
    scope: TWorkspaceScope;
    extendedEntityType?: TExtendedEntitiesTypeDict;
  }) => [
    `${prefix}-entity-count-${extendedEntityType}`,
    {
      virtualLabId,
      projectId,
      extendedEntityType,
      brainRegionId: brainRegionId ?? '',
      scope,
    },
  ],
  userSimulationsCount: ({
    virtualLabId,
    projectId,
    brainRegionId,
    personId,
    scope,
  }: WorkspaceContext & {
    brainRegionId?: string;
    personId?: string;
    scope: TWorkspaceScope;
  }) => [
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
    {
      virtualLabId,
      projectId,
      brainRegionId: brainRegionId ?? '',
      page,
      pageSize,
      ...props,
    },
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
  }: WorkspaceContext & {
    memodelId: string;
    amplitudes: string;
    protocol: string;
  }) => [
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
  singleCircuit: ({
    virtualLabId,
    projectId,
    entityId,
    ...props
  }: WorkspaceContext & { entityId: string } & Record<string, any>) => [
    `${prefix}-single-circuits`,
    { virtualLabId, projectId, entityId, ...props },
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
  oneCircuit: ({
    virtualLabId,
    projectId,
    entityId,
  }: WorkspaceContext & { entityId: string } & Record<string, any>) => [
    `${prefix}-single-circuit`,
    { virtualLabId, projectId, entityId },
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
    {
      virtualLabId,
      projectId,
      entityId,
      entityRoute,
      derivationType,
      page,
      pageSize,
    },
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
  }) => [`${prefix}-scientific-artifact-publication-links`, { ...context, ...props }],
  singleNeuronSimulations: ({
    context,
    ...props
  }: {
    context: WorkspaceContext;
    props: Partial<ISingleNeuronSimulationFilter>;
  }) => [`${prefix}-single-neuron-simulations`, { ...context, ...props }],
  singleNeuronSynaptomeSimulations: ({
    context,
    ...props
  }: {
    context: WorkspaceContext;
    props: Partial<ISingleNeuronSynaptomeSimulationFilter>;
  }) => [`${prefix}-single-neuron-synaptome-simulations`, { ...context, ...props }],
  modelProperties: ({ modelId }: { modelId: string }) => {
    return [`${prefix}-circuit-properties`, modelId];
  },
  emDenseReconstructionDatasets: (
    context: WorkspaceContext,
    props?: IEMDenseReconstructionDatasetFilter
  ) => [`${prefix}-emDenseReconstructionDatasets`, { ...context, ...props }],
  emDenseReconstructionDataset: ({ id, context }: { id: string; context: WorkspaceContext }) => [
    `${prefix}-emDenseReconstructionDataset`,
    { id, context },
  ],
  etype: ({ virtualLabId, projectId }: WorkspaceContext) => [
    `${prefix}-etype-class`,
    { context: { virtualLabId, projectId } },
  ],
  mtype: ({ virtualLabId, projectId }: WorkspaceContext) => [
    `${prefix}-mtype-class`,
    { context: { virtualLabId, projectId } },
  ],
  protocols: (context: WorkspaceContext, props?: IProtocolFilter) => [
    `${prefix}-protocols`,
    { ...context, ...props },
  ],
  protocol: ({ id, context }: { id: string; context: WorkspaceContext }) => [
    `${prefix}-protocol`,
    { id, context },
  ],
  subjects: (context: WorkspaceContext, props?: ISubjectFilter) => [
    `${prefix}-subjects`,
    { ...context, ...props },
  ],
  subject: ({ id, context }: { id: string; context: WorkspaceContext }) => [
    `${prefix}-subject`,
    { id, context },
  ],
  license: (context?: WorkspaceContext) => [`${prefix}-license`, { context }],
  preview: (context: WorkspaceContext, params?: Record<string, any>) => [
    `${prefix}-asset-preview`,
    { context, params },
  ],
  singleIonChannelModelingCampaign: ({
    context,
    id,
    ...props
  }: {
    context: WorkspaceContext;
    id: string;
  } & Record<string, any>) => [
    `${prefix}-ion-channel-modeling-campaign`,
    { context, id, ...props },
  ],
  validationResults: ({
    context,
    id,
    ...props
  }: {
    context: WorkspaceContext;
    id: string;
  } & Record<string, any>) => [`${prefix}-validation-results`, { context, id, ...props }],
  obiOneJsonSchema: (schemaName: string) => [`${prefix}-${schemaName}`, { schemaName }],
};
