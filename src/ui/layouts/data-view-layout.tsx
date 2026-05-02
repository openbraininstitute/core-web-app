import { includes } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { tryCatch } from '@/api/utils';
import { config } from '@/config';
import { WorkspaceScope } from '@/constants';
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
import { cn } from '@/utils/css-class';

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
] as const;

export async function DataViewLayout({
  children,
  context,
  type,
  id,
  inline = false,
}: PropsWithChildren<{
  context: WorkspaceContext;
  type: TExtendedEntitiesTypeDict;
  id: string;
  inline?: boolean;
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

  const breadcrumbs = (
    <DataBreadcrumb title={entityType.title} type={type} group={entityType.group} scope={scope} />
  );
  const closePage = <ClosePage url={parentLink} />;

  if (includes(LeftMenuUnsupportedEntityTypes, type)) {
    return (
      <div
        className={cn(
          'ml-3 flex h-full flex-col rounded-2xl border px-3',
          inline
            ? 'inline-detail-view bg-primary-9 text-white border-transparent ml-0'
            : 'border-[rgb(217,217,217)]'
        )}
      >
        <div className="w-full flex items-center justify-between">
          {breadcrumbs}
          {closePage}
        </div>
        <div className="relative flex-1 overflow-y-auto">{children}</div>
      </div>
    );
  }

  if (!entityType.detailViewSections) return null;

  return (
    <div
      className={cn(
        'relative ml-5 flex flex-col h-full rounded-md border',
        inline
          ? 'inline-detail-view bg-primary-9 text-white border-transparent ml-0 rounded-2xl'
          : 'border-[#D9D9D9]'
      )}
    >
      <div className="w-full flex items-center justify-between px-5 py-2">
        {breadcrumbs}
        {closePage}
      </div>
      <div className="flex h-full max-h-[calc(100%-56px)] overflow-hidden pt-2">
        <div className="w-1/5 pl-5">
          <div className={cn('flex flex-col gap-3', inline && 'inline-detail-tabs')}>
            <DetailMenu sections={entityType.detailViewSections} />
          </div>
          <ActionMenu
            // TODO: fix entity type
            // @ts-expect-error this is a temporary fix
            entity={entity}
            type={type}
            ctx={{ virtualLabId, projectId }}
            parentLink={parentLink}
            isPublicEntity={isPublicEntity}
          />
        </div>
        <div className="w-4/5 pr-1">
          <div className="secondary-scrollbar h-full w-full overflow-x-auto overflow-y-auto p-10 pt-0">
            <EntityNameDisplay name={entity.name} />
            <EntityNameDisplayWrapper>{children}</EntityNameDisplayWrapper>
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
