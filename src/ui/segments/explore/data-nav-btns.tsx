'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { config } from '@/config';
import {
  DATA_GROUP_QUERY_PARAM,
  SCOPE_QUERY_PARAMS,
  type TViewVariant,
  ViewVariant,
  WorkspaceSection,
} from '@/constants';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { createSessionStatePersistence } from '@/features/data-grid/react';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { BreadcrumbTrail } from '@/ui/molecules/breadcrumb';
import Close from '@/ui/molecules/close';
import { useDataListStateSnapshotActions } from '@/ui/segments/data-table/elements/context';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';
import { isBrowser } from '@/utils/environment';
import { getRouteSegmentsAfterWorkspace } from '@/utils/path';
import { resolveConcreteEntityPathParam } from '@/utils/url-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope } from '@/constants';
import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';

function getGroupDisplayName(group: TEntityTypeGroup): string {
  const groupLabels: Record<TEntityTypeGroup, string> = {
    [EntityTypeGroup.Models]: 'Model',
    [EntityTypeGroup.Experimental]: 'Experimental',
    [EntityTypeGroup.Simulations]: 'Simulation',
    [EntityTypeGroup.Notebooks]: 'Notebook',
    [EntityTypeGroup.Extractions]: 'Extraction',
    [EntityTypeGroup.Processing]: 'Processing',
  };
  return groupLabels[group] || group;
}

/**
 * Data › category › type trail for the data details page. Returns the trail only: the host
 * wraps it in a `BreadcrumbChip` (alongside any trailing action) where it wants a pill.
 */
export function DataBreadcrumb({
  type,
  title,
  group,
  scope,
}: {
  type: TExtendedEntitiesTypeDict;
  group: TEntityTypeGroup;
  scope: TWorkspaceScope;
  title: string;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const routeSegments = getRouteSegmentsAfterWorkspace(usePathname(), config.ROOT_ROUTE);
  const section = routeSegments.at(0);
  const queryParams = useSearchParams();

  const { dataKey } = makeDataKey({
    virtualLabId,
    projectId,
    section: WorkspaceSection.Data,
    dataType: type,
    scope,
  });

  const { reset: runStorageReset } = useDataListStateSnapshotActions({
    dataKey,
    dataType: type,
    section: WorkspaceSection.Data,
  });

  const onLinkClick = () => {
    if (isBrowser()) {
      runStorageReset();
      // breadcrumb = fresh listing, so clear the grid's transient session slice
      // (filters/sort/page/search); the durable column-layout slice is left intact
      createSessionStatePersistence().clear?.(dataKey);
    }
  };

  if (section !== WorkspaceSection.Data) return null;

  const dataHome = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data`;
  const withQuery = (path: string, set: Record<string, string> = {}) => {
    const query = new URLSearchParams(queryParams);
    for (const [key, value] of Object.entries(set)) query.set(key, value);
    const search = query.toString();
    return search ? `${path}?${search}` : path;
  };

  return (
    <BreadcrumbTrail
      data-testid="data-view-breadcrumb"
      items={[
        { key: 'data', label: 'Data', href: withQuery(dataHome), onClick: onLinkClick },
        {
          key: 'group',
          label: getGroupDisplayName(group),
          href: withQuery(dataHome, { [DATA_GROUP_QUERY_PARAM]: group }),
          onClick: onLinkClick,
          className: 'capitalize',
        },
        {
          key: 'type',
          label: title,
          href: withQuery(`${dataHome}/browse/entity/${resolveConcreteEntityPathParam(type)}`, {
            [DATA_GROUP_QUERY_PARAM]: group,
            [SCOPE_QUERY_PARAMS]: scope,
          }),
          onClick: onLinkClick,
        },
      ]}
    />
  );
}

export function ClosePage({
  url,
  variant = ViewVariant.Light,
}: {
  url: string;
  variant?: TViewVariant;
}) {
  const routeSegments = getRouteSegmentsAfterWorkspace(usePathname(), config.ROOT_ROUTE);
  const section = routeSegments.at(0);
  if (section !== WorkspaceSection.Data) return null;

  return <Close href={url} className="mr-1" variant={variant} />;
}
