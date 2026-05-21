'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { config } from '@/config';
import { WorkspaceSection } from '@/constants';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import Breadcrumb from '@/ui/molecules/breadcrumb';
import Close from '@/ui/molecules/close';
import '@/ui/segments/detail-view/detail-view-breadcrumb.css';
import { cn } from '@/utils/css-class';
import { useDataListStateSnapshotActions } from '@/ui/segments/data-table/elements/context';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';
import { isBrowser } from '@/utils/environment';
import { getRouteSegmentsAfterWorkspace } from '@/utils/path';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope } from '@/constants';
import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';
import type { WorkspaceContext } from '@/types/common';

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

export function BackToListingOriginButton({
  virtualLabId,
  projectId,
  onClick,
  variant = 'light',
}: WorkspaceContext & { onClick: () => void; variant?: 'light' | 'onPrimary' }) {
  const queryParams = useSearchParams();
  const query = new URLSearchParams(queryParams);

  const linkClass =
    variant === 'onPrimary' ? 'breadcrumb-on-primary-link capitalize' : 'capitalize';

  return (
    <Breadcrumb variant={variant} tone="inactive">
      <Link
        onClick={onClick}
        href={{
          pathname: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data`,
          query: query.toString(),
        }}
        className={linkClass}
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
  variant = 'light',
}: WorkspaceContext & { group: TEntityTypeGroup; onClick: () => void; variant?: 'light' | 'onPrimary' }) {
  const queryParams = useSearchParams();
  const groupDisplayName = getGroupDisplayName(group);

  const linkClass =
    variant === 'onPrimary' ? 'breadcrumb-on-primary-link capitalize' : 'capitalize';

  return (
    <Breadcrumb variant={variant} tone="inactive">
      <Link
        onClick={onClick}
        href={{
          pathname: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data`,
          query: { ...Object.fromEntries(queryParams.entries()), group },
        }}
        className={linkClass}
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
  group,
  scope,
  variant = 'light',
}: WorkspaceContext & {
  type: TExtendedEntitiesTypeDict;
  title: string;
  group: TEntityTypeGroup;
  scope: TWorkspaceScope;
  onClick: () => void;
  variant?: 'light' | 'onPrimary';
}) {
  const queryParams = useSearchParams();
  const query = new URLSearchParams(queryParams);
  query.set('group', group);
  query.set('scope', scope);

  const linkClass =
    variant === 'onPrimary' ? 'breadcrumb-on-primary-link-active' : undefined;

  return (
    <Breadcrumb showChevron={false} variant={variant} tone="active">
      <Link
        onClick={onClick}
        href={{
          pathname: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${type}`,
          query: query.toString(),
        }}
        className={linkClass}
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
  scope,
  variant = 'light',
}: {
  type: TExtendedEntitiesTypeDict;
  group: TEntityTypeGroup;
  scope: TWorkspaceScope;
  title: string;
  variant?: 'light' | 'onPrimary';
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const routeSegments = getRouteSegmentsAfterWorkspace(usePathname(), config.ROOT_ROUTE);
  const section = routeSegments.at(0);

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
    }
  };

  if (section !== WorkspaceSection.Data) return null;
  return (
    <div className={cn('flex flex-nowrap gap-3', variant === 'onPrimary' && 'breadcrumb-trail-on-primary')}>
      <BackToListingOriginButton
        {...{ virtualLabId, projectId, onClick: onLinkClick, variant }}
      />
      <BackToCategory {...{ virtualLabId, projectId, group, onClick: onLinkClick, variant }} />
      <BackToEntityType
        {...{ virtualLabId, projectId, type, title, group, scope, onClick: onLinkClick, variant }}
      />
    </div>
  );
}

export function ClosePage({
  url,
  variant = 'light',
}: {
  url: string;
  variant?: 'light' | 'onPrimary';
}) {
  const routeSegments = getRouteSegmentsAfterWorkspace(usePathname(), config.ROOT_ROUTE);
  const section = routeSegments.at(0);
  if (section !== WorkspaceSection.Data) return null;

  return (
    <Close
      href={url}
      className="mr-1"
      variant={variant}
    />
  );
}
