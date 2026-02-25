/* eslint-disable react/jsx-props-no-spreading */

'use client';

import { PlusOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { kebabCase, snakeCase } from 'es-toolkit/compat';
import Link from 'next/link';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { match, P } from 'ts-pattern';

import { BrainRegionDirection } from '@/api/entitycore/types/shared/request';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { config } from '@/config';
import { WorkspaceScope } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useTableQueryCount } from '@/ui/hooks/use-table-query-count';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Skeleton } from '@/ui/molecules/skeleton';
import { makeSelectContributionEntityClickEvent } from '@/ui/segments/contribute/event';
import { getEntityTypeFromUrlOnEntityScope } from '@/ui/segments/explore/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';
import { getWorkspaceScopeFilters } from '@/utils/workspace-scope';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope } from '@/constants';
import type { WorkspaceContext } from '@/types/common';

function buildDataUrl({
  virtualLabId,
  projectId,
  extendedType,
}: WorkspaceContext & { extendedType: TExtendedEntitiesTypeDict }) {
  return `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${kebabCase(extendedType)}`;
}

type BrowseLinkContentProps = {
  isLoading: boolean;
  isUploadable?: boolean;
  extendedType: TExtendedEntitiesTypeDict;
  title: string;
  count: ReactNode;
  href: string;
};

export function BrowseLinkContent({
  isLoading,
  isUploadable,
  extendedType,
  title,
  count,
  href,
}: BrowseLinkContentProps) {
  const breakpoint = useDefaultBreakpoint();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const scope = (searchParams.get('scope') ?? WorkspaceScope.Public) as TWorkspaceScope;
  const entityType = snakeCase(getEntityTypeFromUrlOnEntityScope(pathname) ?? '');

  const onContribute = () =>
    makeSelectContributionEntityClickEvent({
      display: true,
      entityType: extendedType,
      sessionId: crypto.randomUUID(),
    });

  const onClick = () => userJourneyTracker.registerArtifactClick(title);

  return (
    <div className="group flex w-full items-center justify-center gap-0">
      <div className="relative flex w-full items-center">
        <Button
          asChild
          rounded
          key={`counter-${extendedType}`}
          id={`counter-${extendedType}`}
          variant="outline"
          size="lg"
          className="group w-full shrink grow border-none text-base"
          active={entityType === extendedType}
          onClick={onClick}
        >
          <Link
            href={{
              pathname: href,
              query: searchParams.toString(),
            }}
            className="flex! w-full items-center justify-between!"
          >
            <div className="font-bold text-current">{title}</div>
            <div
              className={cn(
                'text-neutral-4 group-hover:text-label text-sm font-light group-hover:font-bold',
                { 'font-bold text-white': entityType === extendedType }
              )}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-1">
                  <Skeleton className="h-3 w-5 rounded-full" />
                  <span className="text-neutral-2 font-light">of</span>
                  <Skeleton className="h-3 w-5 rounded-full" />
                </div>
              ) : (
                count
              )}
            </div>
          </Link>
        </Button>
        {isUploadable && scope === WorkspaceScope.Project && (
          <div
            className={cn(
              'transition-all duration-500 ease-out',
              'w-0 scale-0 opacity-0',
              'group-hover:w-auto group-hover:scale-100 group-hover:opacity-100',
              'flex origin-left items-center'
            )}
          >
            <Button
              rounded
              variant="outline"
              className={cn(
                'border-neutral-2 hover:bg-primary-9 hover:border-primary-9',
                'h-12 w-12! bg-transparent p-0 hover:text-white',
                'transition-all duration-900 ease-out',
                'shadow-md group-hover:ml-2 group-hover:shadow-xl',
                'group-hover:scale-100',
                { 'h-10! w-10!': breakpoint === 'l' },
                { 'h-12! w-12!': breakpoint === 'xl' }
              )}
              onClick={onContribute}
            >
              <PlusOutlined />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

type Props = {
  extendedType: TExtendedEntitiesTypeDict;
  scope: TWorkspaceScope;
  currentBrainRegionId?: string;
  defaultBrainRegionId?: string;
  enabled: boolean;
};

function buildQuery({
  virtualLabId,
  projectId,
  brainRegionId,
  scope,
  extendedType,
}: WorkspaceContext & {
  brainRegionId: string;
  scope: TWorkspaceScope;
  extendedType: TExtendedEntitiesTypeDict;
}) {
  const query = {
    withFacets: false,
    context: {
      virtualLabId,
      projectId,
    },
    filters: {
      page: 1,
      page_size: 1,
      within_brain_region_hierarchy_id: config.DEFAULT_BRAIN_REGION_HIERARCHY_ID,
      within_brain_region_brain_region_id: brainRegionId ?? null,
      within_brain_region_direction: BrainRegionDirection.ASCENDANTS_AND_DESCENDANTS,
      ...getWorkspaceScopeFilters(scope, { virtualLabId, projectId }),
    },
  };

  const queryKey = keyBuilder.dataCountPerEntity({
    virtualLabId,
    projectId,
    extendedEntityType: extendedType,
    brainRegionId,
    scope,
  });

  return { query, queryKey };
}

export function BrowseLink({
  scope,
  enabled,
  extendedType,
  currentBrainRegionId,
  defaultBrainRegionId,
}: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const { type } = useParams<{ type: TExtendedEntitiesTypeDict }>();

  const entity = getEntityByExtendedType({ type: extendedType });
  const href = buildDataUrl({ virtualLabId, projectId, extendedType });

  // determine if this entity type is the one currently displayed in the data table
  const activeEntityType = snakeCase(type);
  const isActiveEntity = activeEntityType === extendedType;

  // read the filtered count from the table's cached query
  const {
    count: tableCount,
    isLoading: tableCountLoading,
    isError: isTableCountError,
    hasCachedData,
  } = useTableQueryCount({
    extendedType,
    scope,
    workspace: { virtualLabId, projectId },
    isActiveEntity,
  });

  // fallback count query: used when this entity type is NOT the active table entity
  const fallbackQuery = buildQuery({
    virtualLabId,
    projectId,
    brainRegionId: currentBrainRegionId ?? '',
    scope,
    extendedType,
  });

  // root count query: always fetch results (unfiltered total)
  const rootQuery = buildQuery({
    virtualLabId,
    projectId,
    brainRegionId: defaultBrainRegionId ?? '',
    scope,
    extendedType,
  });

  const {
    isLoading: loadingFallback,
    data: fallbackData,
    isError: isFallbackError,
  } = useQuery<{ pagination: { total_items: number } } | undefined>({
    queryKey: fallbackQuery.queryKey,
    queryFn: async () => {
      if (entity?.api.query.count) return entity.api.query.count(fallbackQuery.query);
      return entity?.api.query.list?.(fallbackQuery.query);
    },
    // only fetch when this entity is NOT the active table entity
    enabled: !!currentBrainRegionId && enabled && !isActiveEntity,
    staleTime: Infinity,
  });

  const {
    isLoading: loadingRoot,
    data: root,
    isError: isRootError,
  } = useQuery<{ pagination: { total_items: number } } | undefined>({
    queryKey: rootQuery.queryKey,
    queryFn: async () => {
      if (entity?.api.query.count) return entity.api.query.count(rootQuery.query);
      return entity?.api.query.list?.(rootQuery.query);
    },
    enabled: !!defaultBrainRegionId && enabled,
    staleTime: Infinity,
  });

  // resolve current count: prioritize table query when active, fallback otherwise
  const count = isActiveEntity && hasCachedData ? tableCount : fallbackData?.pagination.total_items;
  const loadingCurrent = isActiveEntity ? tableCountLoading : loadingFallback;
  const isCurrentError = isActiveEntity ? isTableCountError : isFallbackError;
  const rootCount = root?.pagination.total_items;
  const isLoading = loadingCurrent || loadingRoot;

  const countRenderer = match({ isCurrentError, count, rootCount, isRootError, enabled, isLoading })
    .with({ isLoading: false, enabled: true, rootCount: P.number, count: P.number }, () => (
      <span className="flex items-center justify-center gap-1">
        <span className="font-bold">{count}</span>
        <span className="font-light">of</span>
        <span className="font-bold">{rootCount}</span>
      </span>
    ))
    .with(P.union({ isCurrentError: true }, { isRootError: true }), () => {
      return <WarningOutlined className="text-warning" />;
    })
    .with({ enabled: false }, () => (
      <span className="flex items-center justify-center gap-1">
        <span className="font-bold">0</span>
        <span className="font-light">of</span>
        <span className="font-bold">0</span>
      </span>
    ))
    .otherwise(() => null);

  if (!entity) return null;
  return (
    <HydrateWrapper>
      <BrowseLinkContent
        key={`${href.replace('/', '-')}`}
        {...{
          extendedType,
          href,
          scope,
          isLoading,
          isUploadable: entity?.isContributable,
          title: entity?.title,
          count: countRenderer,
        }}
      />
    </HydrateWrapper>
  );
}
