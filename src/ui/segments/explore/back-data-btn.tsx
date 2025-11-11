'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getRouteSegmentsAfterWorkspace } from '@/utils/path';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { ROOT_ROUTE } from '@/config';
import Breadcrumb from '@/ui/molecules/breadcrumb';

import type { WorkspaceContext } from '@/types/common';

export function BackToListingOriginButton({ virtualLabId, projectId }: WorkspaceContext) {
  const queryParams = useSearchParams();
  const query = new URLSearchParams(queryParams);

  return (
    <Breadcrumb>
      <Link
        href={{
          pathname: `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data`,
          query: query.toString(),
        }}
        className="capitalize"
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

export function DataBreadcrumb({
  type,
  title,
}: {
  type: TExtendedEntitiesTypeDict;
  title: string;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const routeSegments = getRouteSegmentsAfterWorkspace(usePathname(), ROOT_ROUTE);
  const section = routeSegments.at(0);
  if (section !== 'data') return null;

  return (
    <div className="flex flex-wrap gap-3">
      <BackToListingOriginButton {...{ virtualLabId, projectId }} />
      <BackToEntityType {...{ virtualLabId, projectId, type, title }} />
    </div>
  );
}
