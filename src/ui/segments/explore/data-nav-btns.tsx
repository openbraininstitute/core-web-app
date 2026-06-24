'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { config } from '@/config';
import { type TViewVariant, ViewVariant, WorkspaceSection } from '@/constants';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import Breadcrumb, { ToneDict } from '@/ui/molecules/breadcrumb';
import Close from '@/ui/molecules/close';
import { useDataListStateSnapshotActions } from '@/ui/segments/data-table/elements/context';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';
import { isBrowser } from '@/utils/environment';
import { getRouteSegmentsAfterWorkspace } from '@/utils/path';
import { resolveConcreteEntityPathParam } from '@/utils/url-builder';

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
  variant = ViewVariant.Light,
}: WorkspaceContext & { onClick: () => void; variant?: TViewVariant }) {
  const queryParams = useSearchParams();
  const query = new URLSearchParams(queryParams);

  const linkClass =
    variant === ViewVariant.Default
      ? 'capitalize text-[#adcdf2] hover:text-[#c5e8ff]'
      : 'capitalize text-primary-9 hover:text-primary-8';

  return (
    <Breadcrumb variant={variant} tone={ToneDict.Inactive}>
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
  variant = ViewVariant.Light,
}: WorkspaceContext & {
  group: TEntityTypeGroup;
  onClick: () => void;
  variant?: TViewVariant;
}) {
  const queryParams = useSearchParams();
  const groupDisplayName = getGroupDisplayName(group);

  const linkClass =
    variant === ViewVariant.Default
      ? 'capitalize text-[#adcdf2] hover:text-[#c5e8ff]'
      : 'capitalize text-primary-9 hover:text-primary-8';

  return (
    <Breadcrumb variant={variant} tone={ToneDict.Inactive}>
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
  variant = ViewVariant.Light,
}: WorkspaceContext & {
  type: TExtendedEntitiesTypeDict;
  title: string;
  group: TEntityTypeGroup;
  scope: TWorkspaceScope;
  onClick: () => void;
  variant?: TViewVariant;
}) {
  const queryParams = useSearchParams();
  const query = new URLSearchParams(queryParams);
  query.set('group', group);
  query.set('scope', scope);

  const linkClass =
    variant === ViewVariant.Default
      ? 'font-bold text-[#adcdf2] hover:text-[#c5e8ff]'
      : 'font-bold text-primary-9 hover:text-primary-8';

  return (
    <Breadcrumb showChevron={false} variant={variant} tone={ToneDict.Active}>
      <Link
        onClick={onClick}
        href={{
          pathname: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${resolveConcreteEntityPathParam(type)}`,
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
  variant = ViewVariant.Light,
}: {
  type: TExtendedEntitiesTypeDict;
  group: TEntityTypeGroup;
  scope: TWorkspaceScope;
  title: string;
  variant?: TViewVariant;
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
    <div className="flex flex-nowrap gap-3">
      <BackToListingOriginButton {...{ virtualLabId, projectId, onClick: onLinkClick, variant }} />
      <BackToCategory {...{ virtualLabId, projectId, group, onClick: onLinkClick, variant }} />
      <BackToEntityType
        {...{ virtualLabId, projectId, type, title, group, scope, onClick: onLinkClick, variant }}
      />
    </div>
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
