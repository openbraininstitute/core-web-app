import { includes } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';
import type { PropsWithChildren } from 'react';

import {
  ExtendedEntitiesTypeDict,
  TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { tryCatch } from '@/api/utils';
import { ROOT_ROUTE } from '@/config';
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

import type { WorkspaceContext } from '@/types/common';

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
  const parentLink = `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${type}?group=${entityType.group}&scope=${isPublicEntity ? WorkspaceScope.Public : WorkspaceScope.Project}`;

  const breadcrumbs = (
    <DataBreadcrumb title={entityType.title} type={type} group={entityType.group} />
  );
  const closePage = <ClosePage url={parentLink} />;

  if (
    type === ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation ||
    type === ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation ||
    type === ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation ||
    type === ExtendedEntitiesTypeDict.MemodelCircuitSimulation
  ) {
    return (
      <div className="relative ml-5 flex h-full flex-col rounded-md border-[1px] border-[#D9D9D9] px-5 py-3">
        {closePage}
        {breadcrumbs}
        {children}
      </div>
    );
  }

  if (!entityType.detailViewSections) return null;

  return (
    <>
      <div className="relative ml-5 flex h-full rounded-md border-[1px] border-[#D9D9D9] py-3">
        {closePage}
        <div className="w-1/5 pl-5">
          {breadcrumbs}
          <div className="mt-5 flex flex-col gap-5">
            <DetailMenu sections={entityType.detailViewSections} />
          </div>
          <ActionMenu entity={entity} type={type} ctx={{ virtualLabId, projectId }} />
        </div>
        <div className="w-4/5 pr-1">
          <div className="secondary-scrollbar h-full w-full overflow-x-auto overflow-y-auto p-10">
            <EntityNameDisplay name={entity.name} />

            <EntityNameDisplayWrapper>{children}</EntityNameDisplayWrapper>
          </div>
        </div>
      </div>
      {includes(
        [ExtendedEntitiesTypeDict.Circuit, ExtendedEntitiesTypeDict.MEModelWithSynapses],
        entityType.extendedType
      ) && <CircuitDownloadPanel />}
    </>
  );
}
