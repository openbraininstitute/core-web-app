'use client';

import { PlusOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { kebabCase, snakeCase } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import Link from 'next/link';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { match, P } from 'ts-pattern';

import {
  dataBrowseListingUsesBrainRegionHierarchy,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { BrainRegionDirection } from '@/api/entitycore/types/shared/request';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { config } from '@/config';
import { WorkspaceScope } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { speciesSelectionModeAtom } from '@/features/brain-region-hierarchy/context';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import {
  savedListingParams,
  useSavedListingFilters,
} from '@/features/data-grid/saved-listing-filters';
import { listingInstanceId } from '@/features/views/listing/variants/scope-listing';
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

import type { MouseEvent, ReactNode } from 'react';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TWorkspaceScope } from '@/constants';
import type { TSavedListingFilters } from '@/features/data-grid/saved-listing-filters';
import type { IListingVariant } from '@/features/views/listing/variants/types';
import type { WorkspaceContext } from '@/types/common';

function buildDataUrl({
  virtualLabId,
  projectId,
  extendedType,
  variant,
}: WorkspaceContext & {
  extendedType: TExtendedEntitiesTypeDict;
  variant?: IListingVariant;
}) {
  const base = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${kebabCase(extendedType)}`;
  return variant ? `${base}/${variant.slug}` : base;
}

type BrowseLinkContentProps = {
  isLoading: boolean;
  isUploadable?: boolean;
  extendedType: TExtendedEntitiesTypeDict;
  title: string;
  count: ReactNode;
  href: string;
  legacy?: boolean;
  /** whether this row is the current listing */
  active: boolean;
  testIdKey: string;
  onNavigate?: (event: MouseEvent<HTMLElement>) => void;
};

export function BrowseLinkContent({
  isLoading,
  isUploadable,
  extendedType,
  title,
  count,
  href,
  legacy,
  active,
  testIdKey,
  onNavigate,
}: BrowseLinkContentProps) {
  const breakpoint = useDefaultBreakpoint();
  const searchParams = useSearchParams();
  const scope = (searchParams.get('scope') ?? WorkspaceScope.Public) as TWorkspaceScope;

  const onContribute = () =>
    makeSelectContributionEntityClickEvent({
      display: true,
      entityType: extendedType,
      sessionId: crypto.randomUUID(),
    });

  const onClick = (event: MouseEvent<HTMLElement>) => {
    onNavigate?.(event);
    userJourneyTracker.registerArtifactClick(title);
  };

  return (
    <div className="group flex w-full items-center justify-center gap-0">
      <div className="flex w-full items-center">
        <div className="relative flex w-full items-center">
          <Button
            asChild
            rounded
            key={`counter-${testIdKey}`}
            id={`counter-${testIdKey}`}
            data-testid={`entity-link-counter-${testIdKey}`}
            variant="outline"
            size="lg"
            className="group w-full shrink grow border-none text-base"
            active={active}
            onClick={onClick}
          >
            <Link
              href={{
                pathname: href,
                query: searchParams.toString(),
              }}
              className="flex! w-full items-center justify-between!"
            >
              {/*
              Superseded types drop to normal weight, matching the workflow menus — the count
              keeps its own weight rules, since it is data rather than part of the label.
            */}
              <div className={cn('text-current', legacy ? 'font-normal' : 'font-bold')}>
                {title}
              </div>
              <div
                className={cn(
                  'text-neutral-4 group-hover:text-label text-sm font-light group-hover:font-bold',
                  { 'font-bold text-white': active }
                )}
              >
                {isLoading ? (
                  <div
                    data-testid={`entity-link-counter-loading-${testIdKey}`}
                    className="flex items-center justify-center gap-1"
                  >
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
        </div>
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
  hierarchyId?: string;
  defaultBrainRegionId?: string;
  enabled: boolean;
  /** renders this row as a variant of `extendedType` */
  variant?: IListingVariant;
  /** runs synchronously on click, before navigation */
  onClick?: (event: MouseEvent<HTMLElement>) => void;
};

function buildQuery({
  virtualLabId,
  projectId,
  hierarchyId,
  brainRegionId,
  scope,
  extendedType,
  applyBrainRegionFilter,
  variant,
  savedFilters,
}: WorkspaceContext & {
  hierarchyId: string;
  brainRegionId: string;
  scope: TWorkspaceScope;
  extendedType: TExtendedEntitiesTypeDict;
  applyBrainRegionFilter: boolean;
  variant?: IListingVariant;
  savedFilters?: TSavedListingFilters | null;
}) {
  const brainRegionQuery =
    applyBrainRegionFilter && brainRegionId
      ? {
          within_brain_region_brain_region_id: brainRegionId,
          within_brain_region_direction: BrainRegionDirection.ASCENDANTS_AND_DESCENDANTS,
        }
      : {};
  const query = {
    withFacets: false,
    context: {
      virtualLabId,
      projectId,
    },
    filters: {
      page: 1,
      page_size: 0,
      ...brainRegionQuery,
      // a sub-item counts only its own slice
      ...variant?.params,
      ...getWorkspaceScopeFilters(scope, { virtualLabId, projectId }),
    },
  };

  const queryKey = keyBuilder.dataCountPerEntity({
    virtualLabId,
    projectId,
    extendedEntityType: extendedType,
    brainRegionId,
    hierarchyId,
    scope,
    variantSlug: variant?.slug,
    savedFilters,
  });

  return { query, queryKey };
}

async function resolveEntityCount({
  query: baseQuery,
  entity,
  extendedType,
  savedFilters,
  variant,
}: {
  query: ReturnType<typeof buildQuery>['query'];
  entity: ReturnType<typeof getEntityByExtendedType>;
  extendedType: TExtendedEntitiesTypeDict;
  savedFilters?: TSavedListingFilters | null;
  variant?: IListingVariant;
}) {
  if (!entity) return undefined;
  const saved = await savedListingParams(extendedType, savedFilters, variant);
  // the pinned params win over the user's, as in the grid's request
  const query = { ...baseQuery, filters: { ...saved, ...baseQuery.filters } };
  if (entity.api.query.count) return entity.api.query.count(query);
  const response = await entity.api.query.list?.(query);
  return (response as EntityCoreResponse<unknown> | undefined)?.pagination?.total_items;
}

export function BrowseLink({
  scope,
  enabled,
  extendedType,
  hierarchyId,
  currentBrainRegionId,
  defaultBrainRegionId,
  variant,
  onClick,
}: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const pathname = usePathname();
  const { type, variant: variantSlug } = useParams<{ type?: string; variant?: string }>();
  const speciesSelectionMode = useAtomValue(speciesSelectionModeAtom);
  const isAllMode = speciesSelectionMode === SpeciesSelectionMode.All;

  const entity = getEntityByExtendedType({ type: extendedType });
  const href = buildDataUrl({ virtualLabId, projectId, extendedType, variant });
  const testIdKey = variant ? `${extendedType}-${variant.slug}` : extendedType;

  const activeEntityType = snakeCase(type ?? getEntityTypeFromUrlOnEntityScope(pathname) ?? '');
  const isActiveEntity = activeEntityType === extendedType && variantSlug === variant?.slug;

  const { dataKey, count: tableCount } = useTableQueryCount({
    extendedType,
    scope,
    workspace: { virtualLabId, projectId },
    isActiveEntity,
    // must match the grid's `id` segment so both read the same dataKey. No listing route passes
    // a base `id` today; if one does, thread it here too or the active row shows the fallback count.
    instanceId: listingInstanceId(undefined, variant),
  });

  // the listing's filters outlive its grid, so the count must not drop them on navigation
  const savedFilters = useSavedListingFilters(dataKey);

  const scopesListingByBrainRegion = dataBrowseListingUsesBrainRegionHierarchy(extendedType);

  // fallback count query: used when this entity type is NOT the active table entity
  const fallbackQuery = buildQuery({
    virtualLabId,
    projectId,
    hierarchyId: hierarchyId ?? '',
    brainRegionId: currentBrainRegionId ?? '',
    scope,
    extendedType,
    applyBrainRegionFilter: scopesListingByBrainRegion,
    variant,
    savedFilters,
  });

  // root count query: always fetch results (unfiltered total)
  const rootQuery = buildQuery({
    virtualLabId,
    projectId,
    hierarchyId: hierarchyId ?? '',
    brainRegionId: defaultBrainRegionId ?? '',
    scope,
    extendedType,
    applyBrainRegionFilter: scopesListingByBrainRegion,
    variant,
  });

  const brainRegionDependentFetch =
    !scopesListingByBrainRegion || isAllMode || !!currentBrainRegionId;
  const brainRegionDependentRootFetch =
    !scopesListingByBrainRegion || isAllMode || !!defaultBrainRegionId;

  const {
    isLoading: loadingFallback,
    data: fallbackData,
    isError: isFallbackError,
  } = useQuery<number | undefined>({
    queryKey: fallbackQuery.queryKey,
    queryFn: () =>
      resolveEntityCount({
        query: fallbackQuery.query,
        entity,
        extendedType,
        savedFilters,
        variant,
      }),
    // waits for storage to be read: an unfiltered count fetched during hydration is thrown away
    enabled:
      enabled &&
      savedFilters !== undefined &&
      brainRegionDependentFetch &&
      (!isActiveEntity || tableCount == null),
    staleTime: Infinity,
  });

  const {
    isLoading: loadingRoot,
    data: root,
    isError: isRootError,
  } = useQuery<number | undefined>({
    queryKey: rootQuery.queryKey,
    queryFn: () => resolveEntityCount({ query: rootQuery.query, entity, extendedType }),
    enabled: enabled && brainRegionDependentRootFetch,
    staleTime: Infinity,
  });

  const resolvedCount = isActiveEntity ? (tableCount ?? fallbackData) : fallbackData;
  const loadingCurrent = isActiveEntity ? false : loadingFallback;
  const count = resolvedCount;
  const isCurrentError = isActiveEntity ? false : isFallbackError;
  const isLoading = loadingCurrent && loadingRoot && resolvedCount == null;

  const countRenderer = match({
    isCurrentError,
    count,
    rootCount: root,
    isRootError,
    enabled,
    loadingCurrent,
    loadingRoot,
  })
    .with({ isLoading: false, enabled: true, rootCount: P.number, count: P.number }, () => (
      <span className="flex items-center justify-center gap-1">
        <span className="font-bold">{count}</span>
        <span className="font-light">of</span>
        <span className="font-bold">{root}</span>
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
    .with({ enabled: true }, () => (
      <span className="flex items-center justify-center gap-1">
        <span className="font-bold">
          {count ?? (
            <Skeleton
              data-testid={`entity-link-counter-loading-current-${testIdKey}`}
              className="inline-block h-3 w-5 rounded-full align-middle"
            />
          )}
        </span>
        <span className="font-light">of</span>
        <span className="font-bold">
          {root ?? (
            <Skeleton
              data-testid={`entity-link-counter-loading-root-${testIdKey}`}
              className="inline-block h-3 w-5 rounded-full align-middle"
            />
          )}
        </span>
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
          active: isActiveEntity,
          onNavigate: onClick,
          testIdKey,
          isUploadable: entity?.isContributable && !variant,
          title: variant?.label ?? entity?.title,
          legacy: entity?.legacy,
          count: countRenderer,
        }}
      />
    </HydrateWrapper>
  );
}
