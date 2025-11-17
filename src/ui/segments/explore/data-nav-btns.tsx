'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getRouteSegmentsAfterWorkspace } from '@/utils/path';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { ROOT_ROUTE } from '@/config';
import Breadcrumb from '@/ui/molecules/breadcrumb';
import Close from '@/ui/molecules/close';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';

import type { WorkspaceContext } from '@/types/common';
import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';

function getGroupDisplayName(group: TEntityTypeGroup): string {
  const groupLabels: Record<TEntityTypeGroup, string> = {
    [EntityTypeGroup.Models]: 'Model',
    [EntityTypeGroup.Experimental]: 'Experimental',
    [EntityTypeGroup.Simulations]: 'Simulation',
    [EntityTypeGroup.Notebooks]: 'Notebook',
  };
  return groupLabels[group] || group;
}

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

export function BackToCategory({
  virtualLabId,
  projectId,
  group,
}: WorkspaceContext & { group: TEntityTypeGroup }) {
  const queryParams = useSearchParams();
  const groupDisplayName = getGroupDisplayName(group);

  return (
    <Breadcrumb>
      <Link
        href={{
          pathname: `${ROOT_ROUTE}/${virtualLabId}/${projectId}/data`,
          query: { ...Object.fromEntries(queryParams.entries()), group },
        }}
        className="capitalize"
      >
        {groupDisplayName}
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
  group,
}: {
  type: TExtendedEntitiesTypeDict;
  title: string;
  group: TEntityTypeGroup;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const routeSegments = getRouteSegmentsAfterWorkspace(usePathname(), ROOT_ROUTE);
  const section = routeSegments.at(0);
  if (section !== 'data') return null;

  return (
    <div className="flex flex-wrap gap-3">
      <BackToListingOriginButton {...{ virtualLabId, projectId }} />
      <BackToCategory {...{ virtualLabId, projectId, group }} />
      <BackToEntityType {...{ virtualLabId, projectId, type, title }} />
    </div>
  );
}

export function ClosePage({ url }: { url: string }) {
  const routeSegments = getRouteSegmentsAfterWorkspace(usePathname(), ROOT_ROUTE);
  const section = routeSegments.at(0);
  if (section !== 'data') return null;

  return <Close href={url} />;
}
