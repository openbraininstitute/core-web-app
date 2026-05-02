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
import { circuitTypes } from '@/entity-configuration/domain/helpers';
import { EmSynapseMappingCampaign } from '@/entity-configuration/domain/model/em-synapse-mapping-campaign';
import { resolveIonChannelModelingCampaignConfig } from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import { SkeletonizationCampaign } from '@/entity-configuration/domain/processing/skeletonization-campaign';
import {
  resolveSimulationByCampaignId,
  resolveSingleNeuronSimulation,
  resolveSingleNeuronSynaptomeSimulation,
} from '@/entity-configuration/domain/simulation';
import {
  resolveSimulationByCampaignId as resolveIonChannelModelSimulationByCampaignId,
  type TResolvedSimulationByCampaign as TResolvedIonChannelModelSimulationByCampaign,
} from '@/entity-configuration/domain/simulation/ion-channel-model-simulation';
import { CellMorphologyViewer } from '@/features/entities/cell-morphology/detail-view';
import { EmCellMeshMetadata } from '@/features/entities/em-cell-mesh';
import MEModelDetails from '@/features/entities/neuron-simulation/elements/me-model-details';
import SynaptomeDetails from '@/features/entities/neuron-simulation/elements/synaptome-details';
import { EphysViewer } from '@/features/ephys-viewer';
import { IonChannelRecordingViewer } from '@/features/ion-channel-recording-viewer';
import { ScanConfiguration } from '@/features/scan-config';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import {
  BuildScanConfigTabs,
  ExtractScanConfigTabs,
  ProcessScanConfigTabs,
  ScanConfigActivity,
  SimulateScanConfigTabs,
} from '@/features/scan-config/types';
import { Field } from '@/ui/segments/detail-view/overview/field';
import IonChannelModelOverview from '@/ui/segments/detail-view/overview/ion-channel-model';
import { DownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';
import { Visualization as CircuitViz } from '@/ui/segments/explore/circuit/elements/visualization';
import { IonChannelModelBuilding } from '@/ui/segments/workflows/build/ion-channel-build';

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
] as const;

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

      return (
        <>
          <ScanConfiguration
            entityId={extractionConfig.circuitId}
            entityType={extendedType}
            virtualLabId={context.virtualLabId}
            projectId={context.projectId}
            initialCampaignId={extractionConfig.campaign.id}
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

      return (
        <>
          <ScanConfiguration
            entityId={config.sourceEntityId}
            entityType={ExtendedEntitiesTypeDict.CellMorphology}
            virtualLabId={context.virtualLabId}
            projectId={context.projectId}
            initialCampaignId={config.campaign.id}
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
    let config: AwaitedType<ReturnType<typeof resolveSimulationByCampaignId>>;

    try {
      config = await resolveSimulationByCampaignId({ id: entity.id, context: context });
    } catch {
      notFound();
    }

    if (!config.simulation?.entity_id) notFound();

    return (
      <ScanConfiguration
        entityId={config.simulation.entity_id}
        entityType={extendedType}
        virtualLabId={context.virtualLabId}
        projectId={context.projectId}
        initialCampaignId={config.campaign.id}
        initialConfig={config.config?.form}
        readOnly={!isWorkflow}
        // This is a temporary solution to show sim campaigns not compliant with obi-one gen config.
        // TODO: remove this after microcircuit scale simulations are fully implemented.
        defaultTab={{
          __activity: ScanConfigActivity.Simulate,
          id:
            extendedType === ExtendedEntitiesTypeDict.MicrocircuitSimulation
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

    return (
      <ScanConfiguration
        entityId={config.simulation.entity_id}
        entityType={ExtendedEntitiesTypeDict.IonChannelModel}
        virtualLabId={context.virtualLabId}
        projectId={context.projectId}
        initialCampaignId={config.campaign.id}
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

    return (
      <>
        <ScanConfiguration
          entityId={extractionConfig.circuitId}
          entityType={extendedType}
          virtualLabId={context.virtualLabId}
          projectId={context.projectId}
          initialCampaignId={extractionConfig.campaign.id}
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

    return (
      <>
        <ScanConfiguration
          entityId={extractionConfig.emCellMeshId}
          entityType={extendedType}
          virtualLabId={context.virtualLabId}
          projectId={context.projectId}
          initialCampaignId={extractionConfig.campaign.id}
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

  const createdByField = commonFields.find((f) => f.field === EntityCoreFields.CreatedBy);
  const registrationDateField = commonFields.find(
    (f) => f.field === EntityCoreFields.RegistrationDate
  );
  const remainingCommonFields = commonFields.filter(
    (f) =>
      f.field !== EntityCoreFields.Description &&
      f.field !== EntityCoreFields.CreatedBy &&
      f.field !== EntityCoreFields.RegistrationDate
  );

  const imageContent =
    extendedType === ExtendedEntitiesTypeDict.SingleNeuronSimulation &&
    singleNeuronSimulationPayload ? (
      <MEModelDetails
        meModel={singleNeuronSimulationPayload.memodel}
        virtualLabId={context.virtualLabId}
        projectId={context.projectId}
      />
    ) : extendedType === ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation &&
      singleNeuronSynaptomeSimulationPayload ? (
      <SynaptomeDetails
        meModel={singleNeuronSynaptomeSimulationPayload.memodel}
        synaptome={singleNeuronSynaptomeSimulationPayload.synaptome}
        virtualLabId={context.virtualLabId}
        projectId={context.projectId}
      />
    ) : circuitTypes.includes(extendedType) ? (
      <CircuitViz circuit={entity as ICircuit} />
    ) : includes(
        [
          ExtendedEntitiesTypeDict.CellMorphology,
          ExtendedEntitiesTypeDict.UniversalCellMorphology,
          ExtendedEntitiesTypeDict.SynthesizedCellMorphology,
        ],
        extendedType
      ) ? (
      <CellMorphologyViewer entity={entity as ICellMorphology} context={context} />
    ) : extendedType === ExtendedEntitiesTypeDict.ElectricalCellRecording ? (
      <EphysViewer entity={entity as IElectricalCellRecording} ctx={context} />
    ) : extendedType === ExtendedEntitiesTypeDict.IonChannelRecording ? (
      <IonChannelRecordingViewer resource={entity as IIonChannelRecording} ctx={context} />
    ) : extendedType === ExtendedEntitiesTypeDict.IonChannelModel ? (
      <IonChannelModelOverview icm={entity as IonChannelModel} ctx={context} />
    ) : extendedType === ExtendedEntitiesTypeDict.EMCellMesh ? (
      <EmCellMeshMetadata id={entity.id} ctx={context} />
    ) : null;

  return (
    <div className="mb-5 rounded-lg border border-gray-300 p-5">
      <div className="mb-4 grid grid-cols-5 gap-4">
        <div className="col-span-4 self-start -mt-2 [&>*:first-child]:mt-0 [&>*:first-child]:pt-0 [&>*:first-child]:ml-0 [&>*:first-child]:pl-0 [&_img]:ml-0 [&_canvas]:ml-0">
          {imageContent}
        </div>
        <div className="flex flex-col gap-4 self-start">
          {createdByField && (
            <Field
              key={createdByField.field}
              field={createdByField.field}
              data={entity}
            />
          )}
          {registrationDateField && (
            <Field
              key={registrationDateField.field}
              field={registrationDateField.field}
              data={entity}
            />
          )}
        </div>
      </div>
      <div className="text-primary-7 mb-4 break-words">{entity.description || '—'}</div>
      <div className="grid grid-cols-3 gap-4">
        {remainingCommonFields.map(({ className, field }) => (
          <Field key={field} className={className} field={field} data={entity} />
        ))}
        {fields.map(({ className, field }) => (
          <Field key={field} className={className} field={field} data={entity} />
        ))}
      </div>
    </div>
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
