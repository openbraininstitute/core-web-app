import { notFound } from 'next/navigation';

import { getMEModel } from '@/api/entitycore/queries';
import { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  CommonSummaryViewFields,
  getViewDefinitionByExtendedType,
} from '@/entity-configuration/definitions/view-defs';
import { circuitTypes, type EntityCoreExtendedType } from '@/entity-configuration/domain/helpers';
import {
  resolveSimulationByCampaignId,
  resolveSingleNeuronSimulation,
  resolveSingleNeuronSynaptomeSimulation,
} from '@/entity-configuration/domain/simulation';
import { CellMorphologyViewer } from '@/features/entities/cell-morphology/detail-view';
import MEModelDetails from '@/features/entities/neuron-simulation/elements/me-model-details';
import SynaptomeDetails from '@/features/entities/neuron-simulation/elements/synaptome-details';
import { EphysViewer } from '@/features/ephys-viewer';
import { IonChannelRecordingViewer } from '@/features/ion-channel-recording-viewer';
import SmallMicrocircuitSimulation from '@/features/small-microcircuit';
import { Field } from '@/ui/segments/detail-view/overview/field';
import IonChannelModelOverview from '@/ui/segments/detail-view/overview/ion-channel-model';
import SubjectDetails from '@/ui/segments/detail-view/overview/subject-details';
import { Visualization as CircuitViz } from '@/ui/segments/explore/circuit/elements/visualization';

import type {
  ICellMorphology,
  IElectricalCellRecording,
  ISingleNeuronSynaptome,
} from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { EntityTypeValue } from '@/entity-configuration/domain';
import type { AwaitedType, WorkspaceContext } from '@/types/common';

export default async function Overview({
  entity,
  extendedType,
  ctx,
  isWorkflow,
}: {
  entity?: EntityTypeValue;
  extendedType: EntityCoreExtendedType;
  ctx: WorkspaceContext;
  isWorkflow: boolean;
}) {
  const fields = getViewDefinitionByExtendedType(extendedType)?.summaryViewFields ?? [];

  if (!entity) notFound();
  const commonFields = CommonSummaryViewFields;

  let singleNeuronSimulationPayload:
    | AwaitedType<ReturnType<typeof resolveSingleNeuronSimulation>>
    | undefined;
  if (extendedType === ExtendedEntitiesTypeDict.SingleNeuronSimulation) {
    try {
      singleNeuronSimulationPayload = await resolveSingleNeuronSimulation(entity.id, ctx);
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
        ctx
      );
    } catch {
      notFound();
    }
  }

  if (extendedType === ExtendedEntitiesTypeDict.SingleNeuronSynaptome) {
    const meModel = await getMEModel({
      id: (entity as ISingleNeuronSynaptome).me_model.id,
      context: ctx,
    });

    (entity as ISingleNeuronSynaptome).me_model = meModel; //eslint-disable-line
  }

  if (
    extendedType === ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation ||
    extendedType === ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation ||
    extendedType === ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation ||
    extendedType === ExtendedEntitiesTypeDict.MemodelCircuitSimulation
  ) {
    let config: AwaitedType<ReturnType<typeof resolveSimulationByCampaignId>>;

    try {
      config = await resolveSimulationByCampaignId({ id: entity.id, context: ctx });
    } catch {
      notFound();
    }

    if (!config.simulation?.entity_id) notFound();

    return (
      <SmallMicrocircuitSimulation
        modelId={config.simulation.entity_id}
        virtualLabId={ctx.virtualLabId}
        projectId={ctx.projectId}
        initialCampaignId={config.campaign.id}
        initialConfig={config.config.form}
        readOnly={!isWorkflow}
      />
    );
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
            virtualLabId={ctx.virtualLabId}
            projectId={ctx.projectId}
          />
        )}
      {extendedType === ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation &&
        singleNeuronSynaptomeSimulationPayload && (
          <SynaptomeDetails
            meModel={singleNeuronSynaptomeSimulationPayload.memodel}
            synaptome={singleNeuronSynaptomeSimulationPayload.synaptome}
            virtualLabId={ctx.virtualLabId}
            projectId={ctx.virtualLabId}
          />
        )}
      {circuitTypes.includes(extendedType) && <CircuitViz circuit={entity as ICircuit} />}
      {extendedType === ExtendedEntitiesTypeDict.CellMorphology && (
        <CellMorphologyViewer entity={entity as ICellMorphology} />
      )}
      {extendedType === ExtendedEntitiesTypeDict.ElectricalCellRecording && (
        <EphysViewer resource={entity as IElectricalCellRecording} ctx={ctx} />
      )}
      {extendedType === ExtendedEntitiesTypeDict.IonChannelRecording && (
        <IonChannelRecordingViewer resource={entity as IIonChannelRecording} ctx={ctx} />
      )}
      {extendedType === ExtendedEntitiesTypeDict.IonChannelModel && (
        <IonChannelModelOverview icm={entity as IonChannelModel} ctx={ctx} />
      )}
    </>
  );
}
