'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { makeDataKey } from '../data-table/elements/helpers';
import { useDataListStateSnapshotActions } from '@/ui/segments/data-table/elements/context';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { getRouteSegmentsAfterWorkspace } from '@/utils/path';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { isBrowser } from '@/utils/environment';
import { ROOT_ROUTE } from '@/config';
import Breadcrumb from '@/ui/molecules/breadcrumb';
import Close from '@/ui/molecules/close';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';
import type { WorkspaceContext } from '@/types/common';

function getGroupDisplayName(group: TEntityTypeGroup): string {
  const groupLabels: Record<TEntityTypeGroup, string> = {
    [EntityTypeGroup.Models]: 'Model',
    [EntityTypeGroup.Experimental]: 'Experimental',
    [EntityTypeGroup.Simulations]: 'Simulation',
    [EntityTypeGroup.Notebooks]: 'Notebook',
  };
  return groupLabels[group] || group;
}

export function BackToListingOriginButton({
  virtualLabId,
  projectId,
  onClick,
}: WorkspaceContext & { onClick: () => void }) {
  const queryParams = useSearchParams();
  const query = new URLSearchParams(queryParams);

  return (
    <Breadcrumb>
      <Link
        onClick={onClick}
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
  onClick,
}: WorkspaceContext & { group: TEntityTypeGroup; onClick: () => void }) {
  const queryParams = useSearchParams();
  const groupDisplayName = getGroupDisplayName(group);

  return (
    <Breadcrumb>
      <Link
        onClick={onClick}
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
  onClick,
}: WorkspaceContext & { type: TExtendedEntitiesTypeDict; title: string; onClick: () => void }) {
  const queryParams = useSearchParams();
  const query = new URLSearchParams(queryParams);

  return (
    <Breadcrumb showChevron={false}>
      <Link
        onClick={onClick}
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
  isPublic,
}: {
  type: TExtendedEntitiesTypeDict;
  title: string;
  group: TEntityTypeGroup;
  isPublic: boolean;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const routeSegments = getRouteSegmentsAfterWorkspace(usePathname(), ROOT_ROUTE);
  const section = routeSegments.at(0);
  const { dataKey } = makeDataKey({
    virtualLabId,
    projectId,
    section: WorkspaceSection.Data,
    dataType: type,
    scope: isPublic ? WorkspaceScope.Public : WorkspaceScope.Project,
  });

  const { reset: runStorageReset } = useDataListStateSnapshotActions({
    dataKey,
    dataType: type,
    section: WorkspaceSection.Data,
  });

  const onLinkClick = () => {
    if (isBrowser()) {
      runStorageReset();
    }
  };

  if (section !== WorkspaceSection.Data) return null;
  return (
    <div className="flex flex-wrap gap-3">
      <BackToListingOriginButton {...{ virtualLabId, projectId, onClick: onLinkClick }} />
      <BackToCategory {...{ virtualLabId, projectId, group, onClick: onLinkClick }} />
      <BackToEntityType {...{ virtualLabId, projectId, type, title, onClick: onLinkClick }} />
    </div>
  );
}

export function ClosePage({ url }: { url: string }) {
  const routeSegments = getRouteSegmentsAfterWorkspace(usePathname(), ROOT_ROUTE);
  const section = routeSegments.at(0);
  if (section !== WorkspaceSection.Data) return null;

  return <Close href={url} />;
}
