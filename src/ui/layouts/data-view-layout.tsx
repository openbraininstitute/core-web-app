import { includes } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { tryCatch } from '@/api/utils';
import { config } from '@/config';
import { ViewVariant, WorkspaceScope } from '@/constants';
import { resolveEFeatureExtractionResultCampaign } from '@/entity-configuration/domain/experimental/efeature-extraction-result';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { retrieveEntity } from '@/entity-configuration/domain/requests';
import { ScanConfigTopBarProvider } from '@/features/scan-config/components/top-bar/context';
import { BreadcrumbChip, BreadcrumbTrail } from '@/ui/molecules/breadcrumb';
import { TopBar } from '@/ui/molecules/top-bar';
import ActionMenu from '@/ui/segments/action-menu';
import { DownloadPanel as CircuitDownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';
import { ClosePage, DataBreadcrumb } from '@/ui/segments/explore/data-nav-btns';
import DetailMenu from '@/ui/segments/explore/detail-menu';
import { DetailViewBody } from '@/ui/segments/explore/detail-view-body';
import {
  EntityNameDisplay,
  EntityNameDisplayWrapper,
} from '@/ui/segments/explore/entity-name-display';
import {
  buildWorkflowCrumbs,
  findScanConfigRegistryByTargetType,
  getWorkflow,
  listActivities,
} from '@/ui/segments/workflows/config';
import { cn } from '@/utils/css-class';
import { resolveConcreteEntityPathParam } from '@/utils/url-builder';

import type { PropsWithChildren, ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { WorkspaceContext } from '@/types/common';

const LeftMenuUnsupportedEntityTypes = [
  ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
  ExtendedEntitiesTypeDict.MicrocircuitSimulation,
  ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
  ExtendedEntitiesTypeDict.EFeatureExtractionCampaign,
  ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
  ExtendedEntitiesTypeDict.IonChannelBuildCampaign,
  ExtendedEntitiesTypeDict.IonChannelModelSimulation,
  ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
  ExtendedEntitiesTypeDict.CircuitSynapticPhysiologyCampaign,
  ExtendedEntitiesTypeDict.SkeletonizationCampaign,
  ExtendedEntitiesTypeDict.RegionCircuitSimulation,
  ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation,
  ExtendedEntitiesTypeDict.EModelOptimizationCampaign,
] as const;

export async function DataViewLayout({
  children,
  context,
  type,
  id,
  origin = 'data',
}: PropsWithChildren<{
  context: WorkspaceContext;
  type: TExtendedEntitiesTypeDict;
  id: string;
  /** Which section opened the page: it decides the breadcrumb and whether there is a close. */
  origin?: 'data' | 'workflows';
}>) {
  const { virtualLabId, projectId } = context;
  const entityType = getEntityByExtendedType({ type });

  if (!entityType) notFound();

  const { data: entity, error } = await tryCatch(
    retrieveEntity({
      type,
      id,
      ctx: { virtualLabId, projectId },
    })
  );

  if (error || !entity) {
    notFound();
  }

  const isPublicEntity = entity.authorized_public;
  const scope = isPublicEntity ? WorkspaceScope.Public : WorkspaceScope.Project;
  const parentLink = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${resolveConcreteEntityPathParam(type)}?group=${entityType.group}&scope=${scope}`;

  // a traceable e-feature extraction result renders its campaign's scan config (see Overview)
  const opensAsCampaign =
    type === ExtendedEntitiesTypeDict.EFeatureExtractionResult &&
    Boolean(
      (await tryCatch(resolveEFeatureExtractionResultCampaign(id, virtualLabId, projectId))).data
    );
  const rendersFullPageWorkflowUi =
    Boolean(findScanConfigRegistryByTargetType(type)) ||
    type === ExtendedEntitiesTypeDict.IonChannelModelingCampaign ||
    opensAsCampaign;
  const useClassicLayout =
    entityType.group === EntityTypeGroup.Simulations || rendersFullPageWorkflowUi;
  const contentVariant = useClassicLayout ? ViewVariant.Light : ViewVariant.Default;
  /**
   * Breadcrumb, side nav, and close button sit on a white header/rail.
   * Section content is the only part that uses the blue panel variant.
   */
  const chromeVariant = ViewVariant.Light;

  const breadcrumbs =
    origin === 'workflows' ? (
      <WorkflowsOriginBreadcrumb type={type} entity={entity} context={context} />
    ) : (
      <DataBreadcrumb
        title={entityType.title}
        type={type}
        group={entityType.group}
        scope={scope}
        name={entity.name}
      />
    );
  // the close lives at the far end of the details page's top bar, never inside the breadcrumb
  const closePage =
    origin === 'data' ? <ClosePage url={parentLink} variant={chromeVariant} /> : undefined;
  // the same top bar row the workflows pages use, above the container: breadcrumb start, close end
  const topBar = <TopBar start={breadcrumbs} end={closePage} />;

  if (includes(LeftMenuUnsupportedEntityTypes, type) || opensAsCampaign) {
    if (useClassicLayout) {
      // campaign / simulation pages render the scan-config tabs panel, which draws its own
      // border and top bar: hand it the breadcrumb and close as that bar's start and end slots
      return (
        <div className="ml-3 flex h-full min-h-0 flex-col">
          <ScanConfigTopBarProvider start={breadcrumbs} end={closePage}>
            <div className="relative min-h-0 flex-1">{children}</div>
          </ScanConfigTopBarProvider>
        </div>
      );
    }

    return (
      <DataViewFrame topBar={topBar} className="overflow-hidden rounded-2xl bg-white pt-5">
        <div className="primary-scrollbar relative mx-5 mb-5 min-h-0 flex-1 overflow-y-auto">
          <div className="rounded-3xl border border-neutral-2 bg-primary-9 px-5 py-5 text-white">
            {children}
          </div>
        </div>
      </DataViewFrame>
    );
  }

  if (!entityType.detailViewSections) return null;

  const downloadPanel = includes(
    [ExtendedEntitiesTypeDict.Circuit, ExtendedEntitiesTypeDict.SingleNeuronCircuit],
    entityType.extendedType
  ) && <CircuitDownloadPanel />;

  if (useClassicLayout) {
    return (
      <DataViewFrame topBar={topBar} className="rounded-md">
        <div className="flex min-h-0 flex-1 overflow-hidden pt-3">
          <div className="w-1/5 pl-5">
            <div className="flex flex-col gap-3">
              <DetailMenu sections={entityType.detailViewSections} variant={chromeVariant} />
            </div>
            <ActionMenu
              entity={entity}
              type={type}
              ctx={{ virtualLabId, projectId }}
              parentLink={parentLink}
              isPublicEntity={isPublicEntity}
              variant={chromeVariant}
            />
          </div>
          <div className="w-4/5 pr-1">
            <div className="secondary-scrollbar flex h-full w-full flex-col overflow-x-auto overflow-y-auto p-10 pt-0">
              <EntityNameDisplay name={entity.name} variant={contentVariant} />
              <EntityNameDisplayWrapper variant={contentVariant}>
                {children}
              </EntityNameDisplayWrapper>
            </div>
          </div>
        </div>
        {downloadPanel}
      </DataViewFrame>
    );
  }

  return (
    <DataViewFrame topBar={topBar} className="overflow-hidden rounded-2xl bg-white">
      <DetailViewBody
        // an e-model's Workflow tab is the optimisation scan-config editor, styled for a light
        // page background rather than the blue detail panel
        plainContentSection={type === ExtendedEntitiesTypeDict.Emodel}
        nameDisplay={
          <EntityNameDisplay
            name={entity.name}
            description={'description' in entity ? entity.description : undefined}
            variant={contentVariant}
          />
        }
        sidebar={
          <>
            <div className="flex flex-col gap-1.5">
              <DetailMenu sections={entityType.detailViewSections} variant={chromeVariant} />
            </div>
            <ActionMenu
              entity={entity}
              type={type}
              ctx={{ virtualLabId, projectId }}
              parentLink={parentLink}
              isPublicEntity={isPublicEntity}
              variant={chromeVariant}
            />
          </>
        }
      >
        {children}
      </DetailViewBody>
      {downloadPanel}
    </DataViewFrame>
  );
}

/**
 * Activity › workflow › entity for the details pages the workflow activity table links to. The
 * page has no workflow definition, so the activity is the first one with a workflow for this type.
 */
function WorkflowsOriginBreadcrumb({
  type,
  entity,
  context,
}: {
  type: TExtendedEntitiesTypeDict;
  entity: { id: string; name: string };
  context: WorkspaceContext;
}) {
  const [match] = listActivities().flatMap((activity) => {
    const workflow = getWorkflow({ activity: activity.value, targetType: type });
    return workflow ? [{ activity, workflow }] : [];
  });

  return (
    <BreadcrumbChip>
      <BreadcrumbTrail
        data-testid="data-view-breadcrumb"
        items={[
          ...buildWorkflowCrumbs({
            activity: match?.activity ?? null,
            workflow: match?.workflow ?? null,
            workspace: context,
            fallbackType: type,
          }),
          {
            key: 'entity',
            label: entity.name,
            ellipsis: entity.name,
            copy: { value: entity.id, label: `Copy ${entity.name}` },
          },
        ]}
      />
    </BreadcrumbChip>
  );
}

/** Bordered container with the top bar row above it (outside the card, not on its border). */
function DataViewFrame({
  topBar,
  className,
  children,
}: PropsWithChildren<{ topBar: ReactNode; className?: string }>) {
  return (
    <div className="ml-5 flex h-full min-h-0 flex-col">
      {topBar}
      <div
        className={cn('relative flex min-h-0 flex-1 flex-col border border-[#D9D9D9]', className)}
      >
        {children}
      </div>
    </div>
  );
}
