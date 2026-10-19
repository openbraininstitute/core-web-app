'use client';

import { DownOutlined, PlusOutlined, RightOutlined, WarningOutlined } from '@ant-design/icons';
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
import { listingInstanceId } from '@/features/views/listing/splits/scope-listing';
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
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TWorkspaceScope } from '@/constants';
import type { IListingSplitOption } from '@/features/views/listing/splits/types';
import type { WorkspaceContext } from '@/types/common';

function buildDataUrl({
  virtualLabId,
  projectId,
  extendedType,
  splitOption,
}: WorkspaceContext & {
  extendedType: TExtendedEntitiesTypeDict;
  splitOption?: IListingSplitOption;
}) {
  const base = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity/${kebabCase(extendedType)}`;
  return splitOption ? `${base}/${splitOption.slug}` : base;
}

/** Collapse control of a row that owns sub-items (rendered beside, not inside, the link). */
export type TBrowseLinkExpander = {
  open: boolean;
  onToggle: () => void;
  controlsId: string;
  label: string;
};

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
  expander?: TBrowseLinkExpander;
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
  expander,
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

  const onClick = () => userJourneyTracker.registerArtifactClick(title);

  return (
    <div className="group flex w-full items-center justify-center gap-0">
      <div className="relative flex w-full items-center">
        {expander && (
          <button
            type="button"
            aria-expanded={expander.open}
            aria-controls={expander.controlsId}
            aria-label={expander.label}
            data-testid={`entity-link-expander-${testIdKey}`}
            onClick={expander.onToggle}
            className={cn(
              'absolute left-2 z-10 flex size-6 items-center justify-center rounded-full text-xs',
              'focus-visible:ring-primary-8 hover:bg-neutral-2/60 focus-visible:ring-2',
              active ? 'text-white hover:bg-white/20' : 'text-neutral-5'
            )}
          >
            {expander.open ? <DownOutlined /> : <RightOutlined />}
          </button>
        )}
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
            className={cn('flex! w-full items-center justify-between!', {
              'pl-10!': expander,
            })}
          >
            {/*
              Superseded types drop to normal weight, matching the workflow menus — the count
              keeps its own weight rules, since it is data rather than part of the label.
            */}
            <div className={cn('text-current', legacy ? 'font-normal' : 'font-bold')}>{title}</div>
            <div
              className={cn(
                'text-neutral-4 group-hover:text-label text-sm font-light group-hover:font-bold',
                { 'font-bold text-white': active }
              )}
            >
              {isLoading ? (
                <div
                  data-testid={`entity-link-counter-loading-${extendedType}`}
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
  /** renders this row as a sub-item of `extendedType`'s split listing */
  splitOption?: IListingSplitOption;
  expander?: TBrowseLinkExpander;
};

function buildQuery({
  virtualLabId,
  projectId,
  hierarchyId,
  brainRegionId,
  scope,
  extendedType,
  applyBrainRegionFilter,
  splitOption,
}: WorkspaceContext & {
  hierarchyId: string;
  brainRegionId: string;
  scope: TWorkspaceScope;
  extendedType: TExtendedEntitiesTypeDict;
  applyBrainRegionFilter: boolean;
  splitOption?: IListingSplitOption;
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
      ...splitOption?.params,
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
    splitSlug: splitOption?.slug,
  });

  return { query, queryKey };
}

async function resolveEntityCount({
  query,
  entity,
}: {
  query: ReturnType<typeof buildQuery>['query'];
  entity: ReturnType<typeof getEntityByExtendedType>;
}) {
  if (!entity) return undefined;
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
  splitOption,
  expander,
}: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const pathname = usePathname();
  const { type, split } = useParams<{ type?: string; split?: string }>();
  const speciesSelectionMode = useAtomValue(speciesSelectionModeAtom);
  const isAllMode = speciesSelectionMode === SpeciesSelectionMode.All;

  const entity = getEntityByExtendedType({ type: extendedType });
  const href = buildDataUrl({ virtualLabId, projectId, extendedType, splitOption });

  const activeEntityType = snakeCase(type ?? getEntityTypeFromUrlOnEntityScope(pathname) ?? '');
  const isActiveEntity = activeEntityType === extendedType && split === splitOption?.slug;

  const { count: tableCount } = useTableQueryCount({
    extendedType,
    scope,
    workspace: { virtualLabId, projectId },
    isActiveEntity,
    // must match the grid's `id` segment so both read the same dataKey
    instanceId: listingInstanceId(undefined, splitOption),
  });

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
    splitOption,
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
    splitOption,
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
    queryFn: () => resolveEntityCount({ query: fallbackQuery.query, entity }),
    enabled: enabled && brainRegionDependentFetch && (!isActiveEntity || tableCount == null),
    staleTime: Infinity,
  });

  const {
    isLoading: loadingRoot,
    data: root,
    isError: isRootError,
  } = useQuery<number | undefined>({
    queryKey: rootQuery.queryKey,
    queryFn: () => resolveEntityCount({ query: rootQuery.query, entity }),
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
              data-testid={`entity-link-counter-loading-current-${extendedType}`}
              className="inline-block h-3 w-5 rounded-full align-middle"
            />
          )}
        </span>
        <span className="font-light">of</span>
        <span className="font-bold">
          {root ?? (
            <Skeleton
              data-testid={`entity-link-counter-loading-root-${extendedType}`}
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
          expander,
          testIdKey: splitOption ? `${extendedType}-${splitOption.slug}` : extendedType,
          isUploadable: entity?.isContributable && !splitOption,
          title: splitOption?.label ?? entity?.title,
          legacy: entity?.legacy,
          count: countRenderer,
        }}
      />
    </HydrateWrapper>
  );
}
