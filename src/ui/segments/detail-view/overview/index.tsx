import { includes } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';

import { getMEModel } from '@/api/entitycore/queries';
import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { tryCatch } from '@/api/utils';
import {
  CommonSummaryViewFields,
  getViewDefinitionByExtendedType,
} from '@/entity-configuration/definitions/view-defs';
import { resolveExtractionByCampaignId } from '@/entity-configuration/domain/extraction/extraction-campaign';
import { circuitTypes } from '@/entity-configuration/domain/helpers';
import { resolveIonChannelModelingCampaignConfig } from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import {
  resolveSimulationByCampaignId,
  resolveSingleNeuronSimulation,
  resolveSingleNeuronSynaptomeSimulation,
} from '@/entity-configuration/domain/simulation';
import { CellMorphologyViewer } from '@/features/entities/cell-morphology/detail-view';
import { EmCellMeshMetadata } from '@/features/entities/em-cell-mesh';
import MEModelDetails from '@/features/entities/neuron-simulation/elements/me-model-details';
import SynaptomeDetails from '@/features/entities/neuron-simulation/elements/synaptome-details';
import { EphysViewer } from '@/features/ephys-viewer';
import { IonChannelRecordingViewer } from '@/features/ion-channel-recording-viewer';
import { ScanConfiguration } from '@/features/scan-config';
import {
  ExtractScanConfigTabs,
  ScanConfigActivity,
  SimulateScanConfigTabs,
} from '@/features/scan-config/types';
import { Field } from '@/ui/segments/detail-view/overview/field';
import IonChannelModelOverview from '@/ui/segments/detail-view/overview/ion-channel-model';
import SubjectDetails from '@/ui/segments/detail-view/overview/subject-details';
import { DownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';
import { Visualization as CircuitViz } from '@/ui/segments/explore/circuit/elements/visualization';
import { IonChannelModelBuilding } from '@/ui/segments/workflows/build/ion-channel-build';

import type {
  ICellMorphology,
  IElectricalCellRecording,
  ISingleNeuronSynaptome,
} from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';
import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';
import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';
import type { AwaitedType, WorkspaceContext } from '@/types/common';

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
  if (
    extendedType === ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation ||
    extendedType === ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation ||
    extendedType === ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation ||
    extendedType === ExtendedEntitiesTypeDict.MicrocircuitSimulation ||
    extendedType === ExtendedEntitiesTypeDict.MemodelCircuitSimulation
  ) {
    let config: AwaitedType<ReturnType<typeof resolveSimulationByCampaignId>>;

    try {
      config = await resolveSimulationByCampaignId({ id: entity.id, context: context });
    } catch (_err) {
      notFound();
    }

    if (!config.simulation?.entity_id) notFound();

    return (
      <ScanConfiguration
        modelId={config.simulation.entity_id}
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
      />
    );
  }
  if (extendedType === ExtendedEntitiesTypeDict.CircuitExtractionCampaign) {
    const { data: extractionConfig, error } = await tryCatch(
      resolveExtractionByCampaignId({ id: entity.id, context: context })
    );

    if (error || !extractionConfig.circuitId) {
      notFound();
    }

    return (
      <>
        <ScanConfiguration
          modelId={extractionConfig.circuitId}
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
        />
        <DownloadPanel />
      </>
    );
  }

  if (extendedType === ExtendedEntitiesTypeDict.IonChannelModelingCampaign) {
    const { data } = await tryCatch(
      resolveIonChannelModelingCampaignConfig({
        id: entity.id,
        context: ctx,
      })
    );

    const initialConfig = data?.config?.form ?? data?.config ?? null;

    return <IonChannelModelBuilding sessionId={entity.id} initialConfig={initialConfig} readonly />;
  }

  return (
    <>
      <div className="mb-5 grid grid-cols-3 gap-4 rounded-lg border border-gray-300 p-5">
        {[...commonFields, ...fields].map(({ className, field }) => {
          return <Field key={field} className={className} field={field} data={entity} />;
        })}
      </div>

      {'subject' in entity && <SubjectDetails className="mb-8" entity={entity} />}

      {extendedType === ExtendedEntitiesTypeDict.SingleNeuronSimulation &&
        singleNeuronSimulationPayload && (
          <MEModelDetails
            meModel={singleNeuronSimulationPayload.memodel}
            virtualLabId={context.virtualLabId}
            projectId={context.projectId}
          />
        )}
      {extendedType === ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation &&
        singleNeuronSynaptomeSimulationPayload && (
          <SynaptomeDetails
            meModel={singleNeuronSynaptomeSimulationPayload.memodel}
            synaptome={singleNeuronSynaptomeSimulationPayload.synaptome}
            virtualLabId={context.virtualLabId}
            projectId={context.projectId}
          />
        )}
      {circuitTypes.includes(extendedType) && <CircuitViz circuit={entity as ICircuit} />}
      {includes(
        [
          ExtendedEntitiesTypeDict.CellMorphology,
          ExtendedEntitiesTypeDict.ComputationallySynthesizedCellMorphology,
        ],
        extendedType
      ) && <CellMorphologyViewer entity={entity as ICellMorphology} />}
      {extendedType === ExtendedEntitiesTypeDict.ElectricalCellRecording && (
        <EphysViewer resource={entity as IElectricalCellRecording} ctx={context} />
      )}
      {extendedType === ExtendedEntitiesTypeDict.IonChannelRecording && (
        <IonChannelRecordingViewer resource={entity as IIonChannelRecording} ctx={context} />
      )}
      {extendedType === ExtendedEntitiesTypeDict.IonChannelModel && (
        <IonChannelModelOverview icm={entity as IonChannelModel} ctx={context} />
      )}
      {extendedType === ExtendedEntitiesTypeDict.EMCellMesh && (
        <EmCellMeshMetadata id={entity.id} ctx={context} />
      )}
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
