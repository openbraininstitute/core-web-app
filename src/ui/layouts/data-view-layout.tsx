import { includes } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { tryCatch } from '@/api/utils';
import { config } from '@/config';
import { ViewVariant, WorkspaceScope } from '@/constants';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { retrieveEntity } from '@/entity-configuration/domain/requests';
import ActionMenu from '@/ui/segments/action-menu';
import { DownloadPanel as CircuitDownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';
import { ClosePage, DataBreadcrumb } from '@/ui/segments/explore/data-nav-btns';
import DetailMenu from '@/ui/segments/explore/detail-menu';
import {
  EntityNameDisplay,
  EntityNameDisplayWrapper,
} from '@/ui/segments/explore/entity-name-display';

import type { PropsWithChildren } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { WorkspaceContext } from '@/types/common';

const LeftMenuUnsupportedEntityTypes = [
  ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
  ExtendedEntitiesTypeDict.MicrocircuitSimulation,
  ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
  ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
  ExtendedEntitiesTypeDict.IonChannelModelSimulation,
  ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
  ExtendedEntitiesTypeDict.SkeletonizationCampaign,
  ExtendedEntitiesTypeDict.RegionCircuitSimulation,
  ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation,
] as const;

export async function DataViewLayout({
  children,
  context,
  type,
  id,
}: PropsWithChildren<{
  context: WorkspaceContext;
  type: TExtendedEntitiesTypeDict;
  id: string;
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

  if (error || !entity) notFound();

  const isPublicEntity = entity.authorized_public;
  const scope = isPublicEntity ? WorkspaceScope.Public : WorkspaceScope.Project;
  const parentLink = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${type}?group=${entityType.group}&scope=${isPublicEntity ? WorkspaceScope.Public : WorkspaceScope.Project}`;

  const useClassicLayout = entityType.group === EntityTypeGroup.Simulations;
  const contentVariant = useClassicLayout ? ViewVariant.Light : ViewVariant.Default;
  /**
   * Breadcrumb, side nav, and close button sit on a white header/rail.
   * Section content is the only part that uses the blue panel variant.
   */
  const chromeVariant = ViewVariant.Light;

  const breadcrumbs = (
    <DataBreadcrumb
      title={entityType.title}
      type={type}
      group={entityType.group}
      scope={scope}
      variant={chromeVariant}
    />
  );
  const closePage = <ClosePage url={parentLink} variant={chromeVariant} />;

  if (includes(LeftMenuUnsupportedEntityTypes, type)) {
    if (useClassicLayout) {
      return (
        <div className="ml-3 flex h-full flex-col rounded-2xl border border-[rgb(217,217,217)] px-3">
          <div className="flex w-full items-center justify-between">
            {breadcrumbs}
            {closePage}
          </div>
          <div className="relative flex-1 overflow-y-auto">{children}</div>
        </div>
      );
    }

    return (
      <div className="relative ml-5 flex h-full flex-col overflow-hidden rounded-2xl border border-[#D9D9D9] bg-white">
        <div className="flex w-full items-center justify-between px-5 pt-4">
          {breadcrumbs}
          {closePage}
        </div>
        <div className="primary-scrollbar relative mx-5 mb-5 min-h-0 flex-1 overflow-y-auto">
          <div className="rounded-3xl border border-neutral-2 bg-primary-9 px-5 py-5 text-white">
            {children}
          </div>
        </div>
      </div>
    );
  }

  if (!entityType.detailViewSections) return null;

  if (useClassicLayout) {
    return (
      <div className="relative ml-5 flex h-full flex-col rounded-md border border-[#D9D9D9]">
        <div className="flex w-full items-center justify-between px-5 py-2">
          {breadcrumbs}
          {closePage}
        </div>
        <div className="flex h-full max-h-[calc(100%-56px)] overflow-hidden pt-2">
          <div className="w-1/5 pl-5">
            <div className="flex flex-col gap-3">
              <DetailMenu sections={entityType.detailViewSections} variant={chromeVariant} />
            </div>
            <ActionMenu
              // TODO: fix entity type
              // @ts-expect-error this is a temporary fix
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
        {includes(
          [ExtendedEntitiesTypeDict.Circuit, ExtendedEntitiesTypeDict.MEModelWithSynapses],
          entityType.extendedType
        ) && <CircuitDownloadPanel />}
      </div>
    );
  }

  return (
    <div className="relative ml-5 flex h-full flex-col overflow-hidden rounded-2xl border border-[#D9D9D9] bg-white">
      <div className="flex w-full items-center justify-between px-5 pt-4">
        {breadcrumbs}
        {closePage}
      </div>
      <div className="flex h-full min-h-0 max-h-[calc(100%-3.5rem)] gap-6 overflow-hidden pt-2">
        <div className="flex w-1/5 shrink-0 flex-col bg-white pl-5">
          <div className="flex flex-col gap-3">
            <DetailMenu sections={entityType.detailViewSections} variant={chromeVariant} />
          </div>
          <ActionMenu
            // TODO: fix entity type
            // @ts-expect-error this is a temporary fix
            entity={entity}
            type={type}
            ctx={{ virtualLabId, projectId }}
            parentLink={parentLink}
            isPublicEntity={isPublicEntity}
            variant={chromeVariant}
          />
        </div>
        <div className="min-h-0 w-4/5 pl-2 pr-3 pb-3">
          <div className="primary-scrollbar h-full overflow-x-auto overflow-y-auto">
            <div className="rounded-3xl border border-neutral-2 bg-primary-9 p-10 pt-4 pb-10 text-white">
              <EntityNameDisplay
                name={entity.name}
                description={'description' in entity ? entity.description : undefined}
                variant={contentVariant}
              />
              <EntityNameDisplayWrapper variant={contentVariant}>
                {children}
              </EntityNameDisplayWrapper>
            </div>
          </div>
        </div>
      </div>
      {includes(
        [ExtendedEntitiesTypeDict.Circuit, ExtendedEntitiesTypeDict.SingleNeuronCircuit],
        entityType.extendedType
      ) && <CircuitDownloadPanel />}
    </div>
  );
}
