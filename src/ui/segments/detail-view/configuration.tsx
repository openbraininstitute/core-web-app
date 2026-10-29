import { isNil } from 'es-toolkit/compat';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { getTaskActivities } from '@/api/entitycore/queries/task';
import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { tryCatch } from '@/api/utils';
import SimulationConfigurationTab from '@/components/simulate/SimulationDetails/configuration-tab';
import { resolveEFeatureExtractionResultCampaign } from '@/entity-configuration/domain/experimental/efeature-extraction-result';
import {
  applyEntityExpansions,
  circuitTypes,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';
import { SingleNeuronSynaptome as singleNeuronSynaptomeEntity } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { resolveCircuitWorkflow } from '@/entity-configuration/domain/optimization/resolve-circuit-campaign';
import { resolveEModelOptimizationCampaign } from '@/entity-configuration/domain/optimization/resolve-emodel-campaign';
import { resolveIonChannelModelingCampaign } from '@/entity-configuration/domain/optimization/resolve-ion-channel-model-campaign';
import { resolveMEModelBuildCampaign } from '@/entity-configuration/domain/optimization/resolve-memodel-campaign';
import {
  singleNeuronSimulationApiQueryExpand,
  singleNeuronSynaptomeSimulationApiQueryExpand,
} from '@/entity-configuration/domain/simulation';
import SynapseGroupList from '@/features/entities/single-neuron-synaptome/detail-view/elements/list-synapses-configuration';
import { ScanConfiguration } from '@/features/scan-config';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import {
  BuildScanConfigTabs,
  ExtractScanConfigTabs,
  OptimizeScanConfigTabs,
  ScanConfigActivity,
} from '@/features/scan-config/types';
import { buildIonChannelWorkflow } from '@/features/scan-config/workflow/definitions/build-ion-channel';
import { buildMEModelWorkflow } from '@/features/scan-config/workflow/definitions/build-memodel';
import { extractEFeaturesWorkflow } from '@/features/scan-config/workflow/definitions/extract-efeatures';
import { optimizeEModelWorkflow } from '@/features/scan-config/workflow/definitions/optimize-emodel';
import {
  detailViewLinkClass,
  detailViewValueClass,
  detailViewVariantFromGroup,
} from '@/ui/segments/detail-view/variant-styles';
import { findScanConfigRegistryByTargetType } from '@/ui/segments/workflows/config/scan-config-registry';
import { cn } from '@/utils/css-class';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type {
  IMEModel,
  ISingleNeuronSimulation,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
import type {
  ISingleNeuronSynaptome,
  TSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';
import type { AwaitedType, WorkspaceContext } from '@/types/common';
import type { SimulationPayload } from '@/types/small-scale-simulator/single-neuron';
import type { Prettify } from '@/utils/type';

type ExpandType = Prettify<{
  memodel: IMEModel;
  config: {
    synapses: Array<TSingleNeuronSynaptomeConfiguration>;
  } | null;
}>;

export async function loadExpandedSingleNeuronSynaptome({
  id,
  virtualLabId,
  projectId,
}: WorkspaceContext & {
  id: string;
}) {
  const { data: source, error } = await tryCatch(
    getSingleNeuronSynaptome({ id, context: { virtualLabId, projectId } })
  );

  if (error) {
    throw new Error('Failed to load single neuron synaptome entity details');
  }

  let data = {} as ExpandType | null;
  let error1 = null;
  if (singleNeuronSynaptomeEntity.api.expand) {
    ({ data, error: error1 } = await tryCatch(
      applyEntityExpansions<ISingleNeuronSynaptome, ExpandType>(
        singleNeuronSynaptomeEntity,
        source,
        {
          virtualLabId,
          projectId,
        }
      )
    ));
  }

  if (error1 || isNil(data)) {
    throw new Error('Failed to load single neuron synaptome relative data');
  }
  return {
    source,
    ...data,
  };
}

export default async function Configuration({
  entity,
  extendedType,
  context,
}: {
  entity: TRetrieveEntityOutput;
  extendedType: TExtendedEntitiesTypeDict;
  context: WorkspaceContext;
}) {
  const entityType = getEntityByExtendedType({ type: extendedType });
  if (!entityType) notFound();

  const fieldVariant = detailViewVariantFromGroup(entityType.group);

  if (extendedType === 'emodel') {
    // the configuration is the scan config of the optimisation campaign that produced
    // the e-model; render the same read-only editor as the campaign's own detail page when traceable
    const { data: optimization } = await tryCatch(
      resolveEModelOptimizationCampaign(entity.id, context.virtualLabId, context.projectId)
    );
    const scanConfig = findScanConfigRegistryByTargetType(
      ExtendedEntitiesTypeDict.EModelOptimizationCampaign
    );

    if (optimization && scanConfig) {
      // a campaign without generated runs (e.g. a migrated e-model) has nothing to show but its
      // configuration, so the tab strip is dropped
      const { data: generations } = await getTaskActivities({
        context,
        filters: {
          used__id: optimization.campaign.id,
          task_activity_type: TaskActivityType.EModelOptimizationConfigGeneration,
          page_size: 1,
        },
      });
      return (
        <ScanConfiguration
          // the e-model optimisation scan config has no `model_identifier` (session mode),
          // so there is no input entity to pass
          entityId={undefined}
          scanConfig={scanConfig}
          virtualLabId={context.virtualLabId}
          projectId={context.projectId}
          origin={optimization.campaign.id}
          initialConfig={optimization.config?.form}
          readOnly
          hideTabs={generations.length === 0}
          defaultTab={{
            __activity: ScanConfigActivity.Optimize,
            id: OptimizeScanConfigTabs.configuration,
          }}
          activity={ScanConfigActivity.Optimize}
          campaignOriginAction={ScanConfigCampaignOriginActionDict.View}
          taskTypeBindings={optimizeEModelWorkflow.taskTypeBindings}
        />
      );
    }

    return (
      <div className="flex h-full w-full items-center justify-center">
        No configuration found for this ME-model.
      </div>
    );
  }

  if (extendedType === ExtendedEntitiesTypeDict.EFeatureExtractionResult) {
    // the workflow tab is the scan config of the extraction campaign that produced this
    // result; render the same read-only editor as the campaign's own detail page when traceable
    const { data: extraction } = await tryCatch(
      resolveEFeatureExtractionResultCampaign(entity.id, context.virtualLabId, context.projectId)
    );
    const scanConfig = findScanConfigRegistryByTargetType(
      ExtendedEntitiesTypeDict.EFeatureExtractionCampaign
    );

    if (extraction && scanConfig) {
      const { data: generations } = await getTaskActivities({
        context,
        filters: {
          used__id: extraction.campaign.id,
          task_activity_type: TaskActivityType.EFeatureExtractionConfigGeneration,
          page_size: 1,
        },
      });
      return (
        <ScanConfiguration
          entityId={extraction.recordingIds.at(0)}
          scanConfig={scanConfig}
          virtualLabId={context.virtualLabId}
          projectId={context.projectId}
          origin={extraction.campaign.id}
          initialConfig={extraction.config?.form}
          readOnly
          hideTabs={generations.length === 0}
          defaultTab={{
            __activity: ScanConfigActivity.Extract,
            id: ExtractScanConfigTabs.configuration,
          }}
          activity={ScanConfigActivity.Extract}
          campaignOriginAction={ScanConfigCampaignOriginActionDict.View}
          taskTypeBindings={extractEFeaturesWorkflow.taskTypeBindings}
        />
      );
    }

    return (
      <div className="flex h-full w-full items-center justify-center">
        No configuration found for this result.
      </div>
    );
  }

  if (extendedType === 'memodel') {
    // the workflow tab is the scan config of the build campaign that produced this ME-model;
    // render the same read-only editor as the campaign's own detail page when traceable
    const { data: build } = await tryCatch(
      resolveMEModelBuildCampaign(entity.id, context.virtualLabId, context.projectId)
    );
    const scanConfig = findScanConfigRegistryByTargetType(
      ExtendedEntitiesTypeDict.MEModelBuildCampaign
    );

    if (build && scanConfig) {
      const { data: generations } = await getTaskActivities({
        context,
        filters: {
          used__id: build.campaign.id,
          task_activity_type: TaskActivityType.MEModelBuildConfigGeneration,
          page_size: 1,
        },
      });
      return (
        <ScanConfiguration
          entityId={build.sourceEntityId ?? undefined}
          scanConfig={scanConfig}
          virtualLabId={context.virtualLabId}
          projectId={context.projectId}
          origin={build.campaign.id}
          initialConfig={build.config?.form}
          readOnly
          hideTabs={generations.length === 0}
          defaultTab={{
            __activity: ScanConfigActivity.Build,
            id: BuildScanConfigTabs.configuration,
          }}
          activity={ScanConfigActivity.Build}
          campaignOriginAction={ScanConfigCampaignOriginActionDict.View}
          taskTypeBindings={buildMEModelWorkflow.taskTypeBindings}
        />
      );
    }

    return (
      <div className="flex h-full w-full items-center justify-center">
        No configuration found for this ME-model.
      </div>
    );
  }

  if (extendedType === ExtendedEntitiesTypeDict.IonChannelModel) {
    // the workflow tab is the scan config of the build campaign that produced this ion channel
    // model; render the same read-only editor as the campaign's own detail page when traceable
    const { data: build } = await tryCatch(
      resolveIonChannelModelingCampaign(entity.id, context.virtualLabId, context.projectId)
    );
    const scanConfig = findScanConfigRegistryByTargetType(
      ExtendedEntitiesTypeDict.IonChannelBuildCampaign
    );

    if (build && scanConfig) {
      const { data: generations } = await getTaskActivities({
        context,
        filters: {
          used__id: build.campaign.id,
          task_activity_type: TaskActivityType.IonChannelModelingConfigGeneration,
          page_size: 1,
        },
      });
      return (
        <ScanConfiguration
          entityId={build.sourceEntityId ?? undefined}
          scanConfig={scanConfig}
          virtualLabId={context.virtualLabId}
          projectId={context.projectId}
          origin={build.campaign.id}
          initialConfig={build.config?.form}
          readOnly
          hideTabs={generations.length === 0}
          defaultTab={{
            __activity: ScanConfigActivity.Build,
            id: BuildScanConfigTabs.configuration,
          }}
          activity={ScanConfigActivity.Build}
          campaignOriginAction={ScanConfigCampaignOriginActionDict.View}
          taskTypeBindings={buildIonChannelWorkflow.taskTypeBindings}
        />
      );
    }

    return (
      <div className="flex h-full w-full items-center justify-center">
        No configuration found for this ion channel model.
      </div>
    );
  }

  if (
    circuitTypes.includes(extendedType) ||
    extendedType === ExtendedEntitiesTypeDict.SingleNeuronCircuit
  ) {
    // the workflow tab is the scan config of whichever build/extract campaign generated this
    // circuit; render the same read-only editor as that campaign's own detail page when traceable
    const { data: circuitWorkflow } = await tryCatch(
      resolveCircuitWorkflow(entity.id, context.virtualLabId, context.projectId)
    );
    const scanConfig = circuitWorkflow
      ? findScanConfigRegistryByTargetType(circuitWorkflow.extendedType)
      : undefined;

    if (circuitWorkflow && scanConfig) {
      const { data: generations } = await getTaskActivities({
        context,
        filters: {
          used__id: circuitWorkflow.campaignId,
          task_activity_type: circuitWorkflow.workflow.taskTypeBindings.configGeneration,
          page_size: 1,
        },
      });
      return (
        <ScanConfiguration
          entityId={circuitWorkflow.entityId ?? undefined}
          scanConfig={scanConfig}
          virtualLabId={context.virtualLabId}
          projectId={context.projectId}
          origin={circuitWorkflow.campaignId}
          initialConfig={circuitWorkflow.form}
          readOnly
          hideTabs={generations.length === 0}
          defaultTab={circuitWorkflow.workflow.editor?.defaultTab}
          activity={circuitWorkflow.workflow.activity}
          campaignOriginAction={ScanConfigCampaignOriginActionDict.View}
          taskTypeBindings={circuitWorkflow.workflow.taskTypeBindings}
        />
      );
    }

    return (
      <div className="flex h-full w-full items-center justify-center">
        No configuration found for this circuit.
      </div>
    );
  }

  if (extendedType === 'single_neuron_synaptome') {
    // a synaptome has no generating task-activity of its own: it's built directly on an
    // ME-model, so the closest thing to "its workflow" is the build campaign of that ME-model
    const synaptome = entity as ISingleNeuronSynaptome;
    let data: AwaitedType<ReturnType<typeof loadExpandedSingleNeuronSynaptome>>;
    try {
      data = await loadExpandedSingleNeuronSynaptome({
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
        id: entity.id,
      });
    } catch {
      notFound();
    }

    const { data: build } = await tryCatch(
      resolveMEModelBuildCampaign(synaptome.me_model.id, context.virtualLabId, context.projectId)
    );
    const scanConfig = findScanConfigRegistryByTargetType(
      ExtendedEntitiesTypeDict.MEModelBuildCampaign
    );

    const workflow =
      build && scanConfig ? (
        <ScanConfiguration
          entityId={build.sourceEntityId ?? undefined}
          scanConfig={scanConfig}
          virtualLabId={context.virtualLabId}
          projectId={context.projectId}
          origin={build.campaign.id}
          initialConfig={build.config?.form}
          readOnly
          defaultTab={{
            __activity: ScanConfigActivity.Build,
            id: BuildScanConfigTabs.configuration,
          }}
          activity={ScanConfigActivity.Build}
          campaignOriginAction={ScanConfigCampaignOriginActionDict.View}
          taskTypeBindings={buildMEModelWorkflow.taskTypeBindings}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          No configuration found for this synaptome.
        </div>
      );

    return (
      <div className="flex w-full flex-col gap-4">
        {build && (
          <div className={cn('flex items-center gap-2', detailViewValueClass(fieldVariant))}>
            Synapses added to ME-model{' '}
            <Link
              href={`${resolveExploreDetailsPageUrl({
                ctx: context,
                dataType: ExtendedEntitiesTypeDict.Memodel,
                entityId: synaptome.me_model.id,
              })}/workflow`}
              className={detailViewLinkClass(fieldVariant)}
            >
              {synaptome.me_model.name}
            </Link>
          </div>
        )}
        {workflow}
        <div className="mt-10">
          <SynapseGroupList config={data.config} variant={fieldVariant} />
        </div>
      </div>
    );
  }

  if (extendedType === 'single_neuron_simulation') {
    let config: AwaitedType<ReturnType<typeof singleNeuronSimulationApiQueryExpand.config>>;
    try {
      config = await singleNeuronSimulationApiQueryExpand.config(
        entity as ISingleNeuronSimulation,
        context
      );
    } catch {
      notFound();
    }

    return (
      <SimulationConfigurationTab
        type="single-neuron-simulation"
        simulation={config as SimulationPayload}
      />
    );
  }

  if (extendedType === 'single_neuron_synaptome_simulation') {
    let config: AwaitedType<
      ReturnType<typeof singleNeuronSynaptomeSimulationApiQueryExpand.config>
    >;
    try {
      config = await singleNeuronSynaptomeSimulationApiQueryExpand.config(
        entity as ISingleNeuronSynaptomeSimulation,
        context
      );
    } catch {
      notFound();
    }

    return (
      <SimulationConfigurationTab
        type="synaptome-simulation"
        simulation={config as SimulationPayload}
      />
    );
  }

  if (extendedType === ExtendedEntitiesTypeDict.SynthesizedCellMorphology) {
    // no backend task-activity/task-config type exists for morphology synthesis, so this can
    // never be traced to a generating workflow
    return (
      <div className="flex h-full w-full items-center justify-center">
        No configuration found for this morphology.
      </div>
    );
  }

  notFound();
}
