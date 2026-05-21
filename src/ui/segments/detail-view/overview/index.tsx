import { includes } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';

import { getMEModel } from '@/api/entitycore/queries';
import {
  EntityTypeDict,
  type ICellMorphology,
  type IElectricalCellRecording,
  type ISingleNeuronSynaptome,
} from '@/api/entitycore/types';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { tryCatch } from '@/api/utils';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  CommonSummaryViewFields,
  getViewDefinitionByExtendedType,
} from '@/entity-configuration/definitions/view-defs';
import { CircuitExtractionCampaign } from '@/entity-configuration/domain/extraction/extraction-campaign';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { circuitTypes, getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { EmSynapseMappingCampaign } from '@/entity-configuration/domain/model/em-synapse-mapping-campaign';
import { resolveIonChannelModelingCampaignConfig } from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import { SkeletonizationCampaign } from '@/entity-configuration/domain/processing/skeletonization-campaign';
import {
  resolveSingleNeuronSimulation,
  resolveSingleNeuronSynaptomeSimulation,
} from '@/entity-configuration/domain/simulation';
import {
  resolveSimulationByCampaignId as resolveIonChannelModelSimulationByCampaignId,
  type TResolvedSimulationByCampaign as TResolvedIonChannelModelSimulationByCampaign,
} from '@/entity-configuration/domain/simulation/ion-channel-model-simulation';
import { CellMorphologyViewer } from '@/features/entities/cell-morphology/detail-view';
import { Morphometrics } from '@/features/entities/cell-morphology/morphometrics';
import { EmCellMeshMetadata } from '@/features/entities/em-cell-mesh';
import MEModelDetails from '@/features/entities/neuron-simulation/elements/me-model-details';
import SynaptomeDetails from '@/features/entities/neuron-simulation/elements/synaptome-details';
import { EphysViewer } from '@/features/ephys-viewer';
import { IonChannelRecordingViewer } from '@/features/ion-channel-recording-viewer';
import { ScanConfiguration } from '@/features/scan-config';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import {
  BuildScanConfigTabs,
  type Config,
  ExtractScanConfigTabs,
  ProcessScanConfigTabs,
  ScanConfigActivity,
  SimulateScanConfigTabs,
} from '@/features/scan-config/types';
import { Field } from '@/ui/segments/detail-view/overview/field';
import IonChannelModelOverview from '@/ui/segments/detail-view/overview/ion-channel-model';
import SubjectDetails from '@/ui/segments/detail-view/overview/subject-details';
import { DownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';
import { Visualization as CircuitViz } from '@/ui/segments/explore/circuit/elements/visualization';
import { IonChannelModelBuilding } from '@/ui/segments/workflows/build/ion-channel-build';
import { findScanConfigRegistryByTargetType } from '@/ui/segments/workflows/config/scan-config-registry';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';
import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';
import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';
import type { AwaitedType, WorkspaceContext } from '@/types/common';

const LegacySimulationCampaigns = [
  ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.MicrocircuitSimulation,
  ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
  ExtendedEntitiesTypeDict.RegionCircuitSimulation,
  ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation,
] as const;

type TLegacySimulationCampaignConfig = {
  campaign: { id: string };
  simulation?: { entity_id?: string | null } | null;
  config?: { form?: Config } | null;
};

export default async function Overview({
  entity,
  extendedType,
  context,
  isWorkflow,
}: {
  entity?: TRetrieveEntityOutput;
  extendedType: TExtendedEntitiesTypeDict;
  context: WorkspaceContext;
  isWorkflow: boolean;
}) {
  const commonFields = CommonSummaryViewFields;
  const fields = removeDuplicates(
    getViewDefinitionByExtendedType(extendedType)?.summaryViewFields ?? [],
    commonFields
  );

  if (!entity) notFound();

  let singleNeuronSimulationPayload:
    | AwaitedType<ReturnType<typeof resolveSingleNeuronSimulation>>
    | undefined;
  if (extendedType === ExtendedEntitiesTypeDict.SingleNeuronSimulation) {
    try {
      singleNeuronSimulationPayload = await resolveSingleNeuronSimulation(entity.id, context);
    } catch {
      notFound();
    }
  }

  let singleNeuronSynaptomeSimulationPayload:
    | AwaitedType<ReturnType<typeof resolveSingleNeuronSynaptomeSimulation>>
    | undefined;

  if (extendedType === ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation) {
    try {
      singleNeuronSynaptomeSimulationPayload = await resolveSingleNeuronSynaptomeSimulation(
        entity.id,
        context
      );
    } catch {
      notFound();
    }
  }

  if (extendedType === ExtendedEntitiesTypeDict.SingleNeuronSynaptome) {
    const meModel = await getMEModel({
      id: (entity as ISingleNeuronSynaptome).me_model.id,
      context: context,
    });

    (entity as ISingleNeuronSynaptome).me_model = meModel;
  }
  // TODO: new simulation and extraction campaigns should be handled here
  if (entity.type === EntityTypeDict.TaskConfig) {
    if (
      'task_config_type' in entity &&
      entity.task_config_type === TaskConfigType.CircuitExtractionCampaign
    ) {
      // biome-ignore lint/style/noNonNullAssertion: function is guaranteed to be defined
      const resolveExtractionCampaign = CircuitExtractionCampaign.api.query.resolve!;
      const { data: extractionConfig, error } = await tryCatch(
        resolveExtractionCampaign({ id: entity.id, context: context })
      );

      if (error || !extractionConfig.circuitId) {
        notFound();
      }

      const scanConfig = findScanConfigRegistryByTargetType(
        ExtendedEntitiesTypeDict.CircuitExtractionCampaign
      );
      if (!scanConfig) {
        notFound();
      }

      return (
        <>
          <ScanConfiguration
            entityId={extractionConfig.circuitId}
            scanConfig={scanConfig}
            virtualLabId={context.virtualLabId}
            projectId={context.projectId}
            origin={extractionConfig.campaign.id}
            initialConfig={extractionConfig.config?.form}
            readOnly={!isWorkflow}
            defaultTab={{
              __activity: ScanConfigActivity.Extract,
              id: ExtractScanConfigTabs.configuration,
            }}
            activity={ScanConfigActivity.Extract}
            campaignOriginAction={ScanConfigCampaignOriginActionDict.View}
          />
          <DownloadPanel />
        </>
      );
    }

    if (
      'task_config_type' in entity &&
      entity.task_config_type === TaskConfigType.EmSynapseMappingCampaign
    ) {
      const { data: config, error } = await tryCatch(
        // biome-ignore lint/style/noNonNullAssertion: function is guaranteed to be defined
        EmSynapseMappingCampaign.api.query.resolve!({ id: entity.id, context: context })
      );

      if (error || !config.sourceEntityId) {
        notFound();
      }

      const scanConfig = findScanConfigRegistryByTargetType(
        ExtendedEntitiesTypeDict.EmSynapseMappingCampaign
      );
      if (!scanConfig) {
        notFound();
      }

      return (
        <>
          <ScanConfiguration
            entityId={config.sourceEntityId}
            scanConfig={scanConfig}
            virtualLabId={context.virtualLabId}
            projectId={context.projectId}
            origin={config.campaign.id}
            initialConfig={config.config?.form}
            readOnly={!isWorkflow}
            defaultTab={{
              __activity: ScanConfigActivity.Build,
              id: BuildScanConfigTabs.configuration,
            }}
            activity={ScanConfigActivity.Build}
            campaignOriginAction={ScanConfigCampaignOriginActionDict.View}
          />
          <DownloadPanel />
        </>
      );
    }
  }

  if (includes(LegacySimulationCampaigns, extendedType)) {
    const simulationEntityConfig = getEntityByExtendedType({ type: extendedType });
    const resolveCampaign = simulationEntityConfig?.api?.query?.resolve;

    if (!resolveCampaign) {
      notFound();
    }

    let config: TLegacySimulationCampaignConfig;

    try {
      config = (await resolveCampaign({
        id: entity.id,
        context: context,
      })) as TLegacySimulationCampaignConfig;
    } catch {
      notFound();
    }

    if (!config.simulation?.entity_id) notFound();

    const scanConfig = findScanConfigRegistryByTargetType(extendedType);
    if (!scanConfig) {
      notFound();
    }

    return (
      <ScanConfiguration
        entityId={config.simulation.entity_id}
        scanConfig={scanConfig}
        virtualLabId={context.virtualLabId}
        projectId={context.projectId}
        origin={config.campaign.id}
        initialConfig={config.config?.form}
        readOnly={!isWorkflow}
        // This is a temporary solution to show sim campaigns not compliant with obi-one gen config.
        // TODO: remove this after microcircuit scale simulations are fully implemented.
        defaultTab={{
          __activity: ScanConfigActivity.Simulate,
          id:
            extendedType === ExtendedEntitiesTypeDict.MicrocircuitSimulation ||
            extendedType === ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation
              ? SimulateScanConfigTabs.simulations
              : ExtractScanConfigTabs.configuration,
        }}
        activity={ScanConfigActivity.Simulate}
        campaignOriginAction={ScanConfigCampaignOriginActionDict.View}
      />
    );
  }

  if (extendedType === ExtendedEntitiesTypeDict.IonChannelModelSimulation) {
    let config: TResolvedIonChannelModelSimulationByCampaign;
    try {
      config = await resolveIonChannelModelSimulationByCampaignId({
        id: entity.id,
        context: context,
      });
    } catch (_err) {
      notFound();
    }

    if (!config.simulation?.entity_id) notFound();

    const scanConfig = findScanConfigRegistryByTargetType(
      ExtendedEntitiesTypeDict.IonChannelModelSimulation
    );
    if (!scanConfig) {
      notFound();
    }

    return (
      <ScanConfiguration
        entityId={config.simulation.entity_id}
        scanConfig={scanConfig}
        virtualLabId={context.virtualLabId}
        projectId={context.projectId}
        origin={config.campaign.id}
        initialConfig={config.config?.form}
        readOnly={!isWorkflow}
        // This is a temporary solution to show sim campaigns not compliant with obi-one gen config.
        // TODO: remove this after microcircuit scale simulations are fully implemented.
        defaultTab={{
          __activity: ScanConfigActivity.Simulate,
          id: ExtractScanConfigTabs.configuration,
        }}
        activity={ScanConfigActivity.Simulate}
        campaignOriginAction={ScanConfigCampaignOriginActionDict.View}
      />
    );
  }
  // FIXME: keeping this for backward compatibility with old extraction campaigns
  // TODO: remove this after all old extraction campaigns are migrated to new ones
  if (extendedType === ExtendedEntitiesTypeDict.CircuitExtractionCampaign) {
    // biome-ignore lint/style/noNonNullAssertion: function is guaranteed to be defined
    const resolveExtractionCampaign = CircuitExtractionCampaign.api.query.resolve!;
    const { data: extractionConfig, error } = await tryCatch(
      resolveExtractionCampaign({ id: entity.id, context: context })
    );

    if (error || !extractionConfig.circuitId) {
      notFound();
    }

    const scanConfig = findScanConfigRegistryByTargetType(
      ExtendedEntitiesTypeDict.CircuitExtractionCampaign
    );
    if (!scanConfig) {
      notFound();
    }

    return (
      <>
        <ScanConfiguration
          entityId={extractionConfig.circuitId}
          scanConfig={scanConfig}
          virtualLabId={context.virtualLabId}
          projectId={context.projectId}
          origin={extractionConfig.campaign.id}
          initialConfig={extractionConfig.config?.form}
          readOnly={!isWorkflow}
          defaultTab={{
            __activity: ScanConfigActivity.Extract,
            id: ExtractScanConfigTabs.configuration,
          }}
          activity={ScanConfigActivity.Extract}
          campaignOriginAction={ScanConfigCampaignOriginActionDict.View}
        />
        <DownloadPanel />
      </>
    );
  }
  if (extendedType === ExtendedEntitiesTypeDict.IonChannelModelingCampaign) {
    const { data } = await tryCatch(
      resolveIonChannelModelingCampaignConfig({
        id: entity.id,
        context,
      })
    );

    const initialConfig = data?.config?.form ?? data?.config ?? null;

    return (
      <IonChannelModelBuilding
        readonly
        sessionId={entity.id}
        originalConfig={initialConfig}
        originalCampaignId={entity.id}
      />
    );
  }

  if (extendedType === ExtendedEntitiesTypeDict.SkeletonizationCampaign) {
    // biome-ignore lint/style/noNonNullAssertion: function is guaranteed to be defined
    const resolveSkeletonizationCampaign = SkeletonizationCampaign.api.query.resolve!;
    const { data: extractionConfig, error } = await tryCatch(
      resolveSkeletonizationCampaign({ id: entity.id, context })
    );

    if (error || !extractionConfig.emCellMeshId) {
      notFound();
    }

    const scanConfig = findScanConfigRegistryByTargetType(
      ExtendedEntitiesTypeDict.SkeletonizationCampaign
    );
    if (!scanConfig) {
      notFound();
    }

    return (
      <>
        <ScanConfiguration
          entityId={extractionConfig.emCellMeshId}
          scanConfig={scanConfig}
          virtualLabId={context.virtualLabId}
          projectId={context.projectId}
          origin={extractionConfig.campaign.id}
          initialConfig={extractionConfig.config?.form}
          readOnly={!isWorkflow}
          defaultTab={{
            __activity: ScanConfigActivity.Process,
            id: ProcessScanConfigTabs.configuration,
          }}
          activity={ScanConfigActivity.Process}
        />
        <DownloadPanel />
      </>
    );
  }

  const morphologyTypes = [
    ExtendedEntitiesTypeDict.CellMorphology,
    ExtendedEntitiesTypeDict.UniversalCellMorphology,
    ExtendedEntitiesTypeDict.SynthesizedCellMorphology,
  ] as const;

  const hasVisualization =
    circuitTypes.includes(extendedType) ||
    includes(morphologyTypes, extendedType) ||
    extendedType === ExtendedEntitiesTypeDict.ElectricalCellRecording ||
    extendedType === ExtendedEntitiesTypeDict.IonChannelRecording ||
    extendedType === ExtendedEntitiesTypeDict.IonChannelModel;

  const isSimulationPage =
    getEntityByExtendedType({ type: extendedType })?.group === EntityTypeGroup.Simulations;
  const fieldVariant = isSimulationPage ? 'light' : 'onPrimary';
  const metadataBorderClass = isSimulationPage ? 'border-gray-300' : 'border-white/20';
  const summaryFields: TypeSummaryProps[] = isSimulationPage
    ? [{ field: EntityCoreFields.Description, className: 'col-span-2' }, ...commonFields, ...fields]
    : [...commonFields, ...fields];

  const metadataGrid = (
    <div className={`mb-5 grid grid-cols-3 gap-4 rounded-lg border p-5 ${metadataBorderClass}`}>
      {summaryFields.map(({ className, field }) => {
        return (
          <Field
            key={field}
            className={className}
            field={field}
            data={entity}
            variant={fieldVariant}
          />
        );
      })}
    </div>
  );

  const visualizations = hasVisualization ? (
    <div className={isSimulationPage ? undefined : 'mb-8'}>
      {circuitTypes.includes(extendedType) && <CircuitViz circuit={entity as ICircuit} />}
      {includes(morphologyTypes, extendedType) && (
        <CellMorphologyViewer entity={entity as ICellMorphology} />
      )}
      {extendedType === ExtendedEntitiesTypeDict.ElectricalCellRecording && (
        <EphysViewer
          entity={entity as IElectricalCellRecording}
          ctx={context}
          defaultToInteractiveDetails={!isSimulationPage}
          variant={fieldVariant}
        />
      )}
      {extendedType === ExtendedEntitiesTypeDict.IonChannelRecording && (
        <IonChannelRecordingViewer
          resource={entity as IIonChannelRecording}
          ctx={context}
          variant={fieldVariant}
        />
      )}
      {extendedType === ExtendedEntitiesTypeDict.IonChannelModel && (
        <IonChannelModelOverview
          icm={entity as IonChannelModel}
          ctx={context}
          variant={fieldVariant}
        />
      )}
    </div>
  ) : null;

  const subjectSection =
    'subject' in entity ? (
      <SubjectDetails
        className="mb-8"
        entity={entity}
        variant={fieldVariant}
      />
    ) : null;

  const meModelSection =
    extendedType === ExtendedEntitiesTypeDict.SingleNeuronSimulation &&
    singleNeuronSimulationPayload ? (
      <MEModelDetails
        meModel={singleNeuronSimulationPayload.memodel}
        virtualLabId={context.virtualLabId}
        projectId={context.projectId}
        variant={fieldVariant}
      />
    ) : null;

  const synaptomeSection =
    extendedType === ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation &&
    singleNeuronSynaptomeSimulationPayload ? (
      <SynaptomeDetails
        meModel={singleNeuronSynaptomeSimulationPayload.memodel}
        synaptome={singleNeuronSynaptomeSimulationPayload.synaptome}
        virtualLabId={context.virtualLabId}
        projectId={context.projectId}
        variant={fieldVariant}
      />
    ) : null;

  const emCellMeshSection =
    extendedType === ExtendedEntitiesTypeDict.EMCellMesh ? (
      <EmCellMeshMetadata id={entity.id} ctx={context} variant={fieldVariant} />
    ) : null;

  const morphometricsSection = includes(morphologyTypes, extendedType) ? (
    <Morphometrics
      className="mb-8"
      morphology={entity as ICellMorphology}
      context={context}
      variant={fieldVariant}
    />
  ) : null;

  if (isSimulationPage) {
    return (
      <>
        {metadataGrid}
        {subjectSection}
        {meModelSection}
        {synaptomeSection}
        {visualizations}
        {emCellMeshSection}
      </>
    );
  }

  return (
    <>
      {visualizations}
      {metadataGrid}
      {subjectSection}
      {meModelSection}
      {synaptomeSection}
      {emCellMeshSection}
      {morphometricsSection}
    </>
  );
}

/**
 * Prevent `extraFields` from having fields already own by `commonFields`.
 */
function removeDuplicates(
  extraFields: TypeSummaryProps[],
  commonFields: TypeSummaryProps[]
): TypeSummaryProps[] {
  const fieldsToExclude = new Set<string>(commonFields.map((item) => item.field));
  const fields = extraFields.filter((item) => !fieldsToExclude.has(item.field));
  return fields;
}
