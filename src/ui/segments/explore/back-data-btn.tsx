'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { MiniDetailViewSearchParam } from '@/ui/segments/mini-detail-view/event';
import { ROOT_ROUTE } from '@/config';
import Breadcrumb from '@/ui/molecules/breadcrumb';

import type { WorkspaceContext } from '@/types/common';

export function BackToDataButton({ virtualLabId, projectId }: WorkspaceContext) {
  const queryParams = useSearchParams();
  const query = new URLSearchParams(queryParams);
  query.delete(MiniDetailViewSearchParam);

  return (
    <Breadcrumb>
      <Link
        href={{
          pathname: `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data`,
          query: query.toString(),
        }}
      >
        Data
      </Link>
    </Breadcrumb>
  );
}

export function BackToEntityType({
  virtualLabId,
  projectId,
  type,
  title,
}: WorkspaceContext & { type: TExtendedEntitiesTypeDict; title: string }) {
  const queryParams = useSearchParams();
  const query = new URLSearchParams(queryParams);
  query.delete(MiniDetailViewSearchParam);

  return (
    <Breadcrumb showChevron={false}>
      <Link
        href={{
          pathname: `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${type}`,
          query: query.toString(),
        }}
      >
        {title}
      </Link>
    </Breadcrumb>
  );
}
