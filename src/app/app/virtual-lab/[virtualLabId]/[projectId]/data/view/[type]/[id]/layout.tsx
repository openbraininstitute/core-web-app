import { snakeCase } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';
import { ReactNode } from 'react';

import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';
import DetailMenu from '@/ui/segments/explore/detail-menu';
import ActionMenu from '@/ui/segments/action-menu';
import Close from '@/ui/molecules/close';
import { DownloadPanel as CircuitDownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { BackToDataButton, BackToEntityType } from '@/ui/segments/explore/back-data-btn';
import { WorkspaceScope } from '@/constants';
import { ROOT_ROUTE } from '@/config';

import type { WorkspaceContext, AwaitedType, ServerSideComponentProp } from '@/types/common';

interface Params {
  id: string;
  type: string;
}

export async function downloadEntity({
  type,
  id,
  ctx,
}: {
  type: EntityCoreExtendedType;
  id: string;
  ctx: WorkspaceContext;
}) {
  if (!type || !id) notFound();

  const entityType = getEntityByExtendedType({ type });
  if (!entityType) notFound();

  const fetchEntity = entityType.api.query.one;

  let entity: AwaitedType<ReturnType<typeof fetchEntity>> | undefined;

  try {
    entity = await fetchEntity({ id, context: ctx });
  } catch {
    notFound();
  }

  if (!entity) notFound();
  return entity;
}

export default async function Layout({
  children,
  params,
}: ServerSideComponentProp<WorkspaceContext & Params, null> & {
  children: ReactNode;
}) {
  const awaitedParams = await params;

  const { virtualLabId, projectId, id } = awaitedParams;
  const type = snakeCase(awaitedParams.type) as EntityCoreExtendedType;

  const entityType = getEntityByExtendedType({ type });

  if (!entityType) notFound();

  const entity = await downloadEntity({
    type,
    id,
    ctx: { virtualLabId, projectId },
  });

  const isPublicEntity = entity.authorized_public;
  const parentLink = `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${type}?group=${entityType.group}&scope=${isPublicEntity ? WorkspaceScope.Public : WorkspaceScope.Project}`;

  const breadcrumbs = (
    <div className="flex flex-wrap gap-3">
      <BackToDataButton {...{ virtualLabId, projectId }} />
      <BackToEntityType {...{ virtualLabId, projectId, type, title: entityType.title }} />
    </div>
  );

  if (
    type === ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation ||
    type === ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation
  ) {
    return (
      <div className="relative ml-5 flex h-full flex-col rounded-md border-[1px] border-[#D9D9D9] px-5 py-3">
        <Close href={parentLink} />
        {breadcrumbs}
        {children}
      </div>
    );
  }

  if (!entityType.detailViewSections) return null;

  return (
    <>
      <div className="relative ml-5 flex h-full rounded-md border-[1px] border-[#D9D9D9] py-3">
        <Close href={parentLink} />
        <div className="w-1/5 pl-5">
          {breadcrumbs}
          <div className="mt-5 flex flex-col gap-5">
            <DetailMenu sections={entityType.detailViewSections} />
          </div>
          <ActionMenu entity={entity} type={type} ctx={{ virtualLabId, projectId }} />
        </div>
        <div className="w-4/5 pr-1">
          <div className="secondary-scrollbar h-full w-full overflow-x-auto overflow-y-auto p-10">
            <div className="mb-4 select-none">
              <div className="text-neutral-4 uppercase">Name</div>
              <div className="text-primary-8 line-clamp-3 text-2xl font-bold">{entity.name}</div>
            </div>

            <div className="h-[calc(100%-7rem)]">{children}</div>
          </div>
        </div>
      </div>
      {entityType.extendedType === 'circuit' && <CircuitDownloadPanel />}
    </>
  );
}
