import { isNil } from 'es-toolkit/compat';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { getAsset } from '@/api/entitycore/selectors/assets';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { tryCatch } from '@/api/utils';
import SimulationConfigurationTab from '@/components/simulate/SimulationDetails/configuration-tab';
import {
  applyEntityExpansions,
  circuitTypes,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';
import { SingleNeuronSynaptome as singleNeuronSynaptomeEntity } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { resolveGeneratingWorkflow } from '@/entity-configuration/domain/resolve-generating-workflow';
import {
  singleNeuronSimulationApiQueryExpand,
  singleNeuronSynaptomeSimulationApiQueryExpand,
} from '@/entity-configuration/domain/simulation';
import SynaptomeConfig from '@/features/entities/single-neuron-synaptome/detail-view/configuration';
import SynapseGroupList from '@/features/entities/single-neuron-synaptome/detail-view/elements/list-synapses-configuration';
import { ScanConfigConfigSearchParam } from '@/features/scan-config/helpers';
import { WorkflowConfigView } from '@/features/scan-config/view/workflow-config-view';
import { Button } from '@/ui/molecules/button';
import { JsonView } from '@/ui/segments/detail-view/json-view';
import { detailViewVariantFromGroup } from '@/ui/segments/detail-view/variant-styles';
import {
  buildWorkflowActivityConfigurationHref,
  buildWorkflowActivityResultsHref,
} from '@/ui/segments/workflows/elements/workflow-activity-actions';

import type { ReactNode } from 'react';
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
import type { Json } from '@/ui/segments/detail-view/json-view';
import type { Prettify } from '@/utils/type';

/** Models whose Configuration tab shows the task config of the workflow that generated them. */
const workflowConfigTypes: TExtendedEntitiesTypeDict[] = [
  ExtendedEntitiesTypeDict.Emodel,
  ExtendedEntitiesTypeDict.Memodel,
  ExtendedEntitiesTypeDict.IonChannelModel,
  ExtendedEntitiesTypeDict.SingleNeuronCircuit,
  ExtendedEntitiesTypeDict.EFeatureExtractionResult,
  ...circuitTypes,
];

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

  if (workflowConfigTypes.includes(extendedType)) {
    const { data: workflow } = await tryCatch(
      resolveGeneratingWorkflow(entity.id, context.virtualLabId, context.projectId)
    );
    if (!workflow) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          No configuration found for this {entityType.title.toLowerCase()}.
        </div>
      );
    }

    const linkOptions = {
      activity: workflow.workflowActivity,
      listEntityType: workflow.workflow.targetType,
      workspace: context,
      row: workflow.campaign,
    };
    const configHref = buildWorkflowActivityConfigurationHref(linkOptions);
    const outputHref = buildWorkflowActivityResultsHref({
      ...linkOptions,
      query: { [ScanConfigConfigSearchParam]: workflow.coordinateConfig.id },
    });
    const asset = getAsset({
      assets: workflow.coordinateConfig.assets,
      label: AssetLabel.task_config,
    }).getOneOrNull();
    // the download redirects to S3, which serves it as binary/octet-stream, so parse it here
    const config: Record<string, Json> | null = asset
      ? await downloadAsset({
          ctx: context,
          entityType: EntityTypeDict.TaskConfig,
          entityId: workflow.coordinateConfig.id,
          id: asset.id,
          asRawResponse: true,
        }).then((response) => response.json() as Promise<Record<string, Json>>)
      : null;
    const { scanConfig } = workflow.workflow;
    const links = (
      // pinned to the detail panel (DetailViewBody), level with the entity name above
      <div className="absolute top-4 right-10 flex gap-2">
        {configHref && <WorkflowLink href={configHref}>Workflow config</WorkflowLink>}
        {outputHref && <WorkflowLink href={outputHref}>Workflow output</WorkflowLink>}
      </div>
    );

    return (
      <div className="w-full">
        {config && scanConfig ? (
          <WorkflowConfigView
            scanConfig={{
              configureBinding: scanConfig.configureBinding,
              schemaName: scanConfig.schemaName,
              targetType: workflow.workflow.targetType,
            }}
            activity={scanConfig.definition.activity}
            config={config}
            campaignId={workflow.campaign.id}
            virtualLabId={context.virtualLabId}
            projectId={context.projectId}
            variant={fieldVariant}
            links={links}
          />
        ) : config ? (
          <JsonView value={config} variant={fieldVariant} />
        ) : (
          <div className="flex items-center justify-center py-20">
            The configuration file of this {entityType.title.toLowerCase()} is missing.
          </div>
        )}
      </div>
    );
  }

  if (extendedType === 'single_neuron_synaptome') {
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

    return (
      <div className="flex w-full flex-col gap-4">
        <SynaptomeConfig
          memodel={data.memodel}
          virtualLabId={context.virtualLabId}
          projectId={context.projectId}
          variant={fieldVariant}
        />

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

  notFound();
}

function WorkflowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button asChild variant="outline" size="sm" rounded>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
