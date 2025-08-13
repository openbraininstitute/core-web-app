'use client';

import { ReactNode } from 'react';
import NextLink from 'next/link';
import { notFound, useParams } from 'next/navigation';
import Breadcrumb from '@/ui/molecules/breadcrumb';
import { basePath } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export default function Layout({ children }: { children: ReactNode }) {
  const { virtualLabId, projectId } = useWorkspace();
  const { type, id } = useParams();

  if (!type || !id) notFound();

  const entityType = getEntityByExtendedType({ type: type as TExtendedEntitiesTypeDict });
  if (!entityType) notFound();

  const fetchEntity = entityType.api.query.one;
  const entity =
    fetchEntity && (await fetchEntity({ id: id as string, context: { virtualLabId, projectId } }));

  if (!entity) notFound();

  return (
    <div className="ml-5 flex h-full rounded-md border-[1px] border-[#D9D9D9] px-5 py-3">
      <div className="flex basis-1/5">
        <div className="flex flex-wrap gap-3">
          <Breadcrumb>
            <NextLink href={`${basePath}/app/v2/${virtualLabId}/${projectId}/explore`}>
              Explore
            </NextLink>
          </Breadcrumb>
          <Breadcrumb>
            <NextLink
              href={`${basePath}/app/v2/${virtualLabId}/${projectId}/explore/browse/${type}`}
            >
              {type}
            </NextLink>
          </Breadcrumb>
          <Breadcrumb showChevron={false}>One</Breadcrumb>
        </div>
      </div>
      <div className="grow basis-4/5">{children}</div>
    </div>
  );
}
