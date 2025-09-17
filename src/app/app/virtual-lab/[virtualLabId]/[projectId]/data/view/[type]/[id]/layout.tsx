import { ReactNode } from 'react';
import NextLink from 'next/link';
import snakeCase from 'lodash/snakeCase';
import { notFound } from 'next/navigation';
import Breadcrumb from '@/ui/molecules/breadcrumb';
import { ROOT_ROUTE } from '@/config';
import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';
import DetailMenu from '@/ui/segments/explore/detail-menu';
import ActionMenu from '@/ui/segments/action-menu';
import type { WorkspaceContext, AwaitedType } from '@/types/common';
import Close from '@/ui/molecules/close';

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
}: {
  children: ReactNode;
  params: Promise<Params & WorkspaceContext>;
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

  return (
    <div className="ml-5 flex h-full rounded-md border-[1px] border-[#D9D9D9] px-5 py-3">
      <div className="w-1/5">
        <div className="flex flex-wrap gap-3">
          <Breadcrumb>
            <NextLink href={`${ROOT_ROUTE}/${virtualLabId}/${projectId}/data`}>Explore</NextLink>
          </Breadcrumb>
          <Breadcrumb>
            <NextLink
              href={`${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${type}`}
            >
              {entityType.title}
            </NextLink>
          </Breadcrumb>
          <Breadcrumb showChevron={false}>{entity.name}</Breadcrumb>
        </div>
        <div className="mt-5 flex flex-col gap-5">
          <DetailMenu sections={entityType.detailViewSections} />
        </div>
        <ActionMenu entity={entity} type={type} ctx={{ virtualLabId, projectId }} />
      </div>
      <div className="relative w-4/5">
        <div className="h-full w-full overflow-x-auto overflow-y-auto p-10">
          <div className="h-[9%]">
            <div className="text-neutral-4 uppercase">Name</div>
            <div className="text-primary-8 text-2xl font-bold">{entity.name}</div>
          </div>
          <div className="h-[91%]">{children}</div>
        </div>
        <Close />
      </div>
    </div>
  );
}
