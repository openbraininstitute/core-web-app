'use client';

import { useRouter } from '@bprogress/next';
import { notFound, useSearchParams } from 'next/navigation';
import { use, useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import { INTERNAL_QUERY_CACHE_PREFIX } from '@/constants';
import {
  type TWorkflowSchemaSelection,
  WorkflowSchemaSelectionMode,
} from '@/features/scan-config/workflow/workflow-schema-selection';
import {
  type TWorkflowSessionSelectionPayload,
  WorkflowSessionSelectionMode,
} from '@/features/scan-config/workflow/workflow-session-selection';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { WorkflowBrowsePrerequisite } from '@/ui/segments/workflows/browse/prerequisite';
import { useWorkflowSelectionConfig } from '@/ui/segments/workflows/browse/use-workflow-selection-config';
import { useWorkflowBreadcrumbState } from '@/ui/segments/workflows/browse/workflow-breadcrumb-context';
import {
  buildScanConfigConfigureHref,
  getEntityMeta,
  getPrimaryConfigurationInput,
  getWorkflowInitialStage,
  WORKFLOW_SESSION_ID_SEARCH_PARAM,
  WorkflowConfigureRoutingDict,
  WorkflowInitialStageDict,
  workflowHasMultipleSources,
} from '@/ui/segments/workflows/config';
import {
  type IWorkflowConfigurationInput,
  type TActivityValue,
  WorkflowBreadcrumbPhaseDict,
} from '@/ui/segments/workflows/config/types';
import { cn } from '@/utils/css-class';
import { resolveExtendedTypeFromPathParamUrl } from '@/utils/url-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { TWorkspaceSection } from '@/constants';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TBrowsePrerequisiteValue } from '@/ui/segments/workflows/browse/browse-config';
import type { KebabCase } from '@/utils/type';

/** height reserved for the multi-entity "Use selection" footer in workflow browse grids. */
const WORKFLOW_BROWSE_USE_SELECTION_BAR_HEIGHT = '4.5rem';

type WorkflowNewBrowsePageProps = {
  activity: TActivityValue;
  section: TWorkspaceSection;
  targetType: TExtendedEntitiesTypeDict;
};

export type TWorkflowBrowseSelectionsByType = Partial<
  Record<TExtendedEntitiesTypeDict, EntityCoreIdentifiableNamed[]>
>;

export function isWorkflowMultiEntityBrowse(opts: {
  selectionConfig: TWorkflowSchemaSelection | null | undefined;
}): boolean {
  const { selectionConfig } = opts;

  if (!selectionConfig) {
    return false;
  }

  const { selectionMode } = selectionConfig;

  return (
    selectionMode === WorkflowSchemaSelectionMode.Multiple ||
    selectionMode === WorkflowSchemaSelectionMode.Grouped
  );
}

export function buildWorkflowBrowseSelectionPayload(opts: {
  selectionConfig: TWorkflowSchemaSelection | null | undefined;
  configurationInputs: readonly IWorkflowConfigurationInput[];
  selectionsByType: TWorkflowBrowseSelectionsByType;
  mergeBrowseSelectionIntoSingleGroup?: boolean;
}): TWorkflowSessionSelectionPayload | null {
  const { selectionConfig, configurationInputs, selectionsByType } = opts;

  const groups = configurationInputs
    .map((input) => ({
      name: input.label,
      items: (selectionsByType[input.type] ?? []).map((row) => ({
        type: input.type,
        id: row.id,
      })),
    }))
    .filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return null;
  }

  if (selectionConfig?.selectionMode === WorkflowSchemaSelectionMode.Grouped) {
    if (opts.mergeBrowseSelectionIntoSingleGroup) {
      return {
        mode: WorkflowSessionSelectionMode.Grouped,
        groups: [{ name: 'Default name', items: groups.flatMap((group) => group.items) }],
      };
    }

    return { mode: WorkflowSessionSelectionMode.Grouped, groups };
  }

  const items = groups.flatMap((group) => group.items);

  if (items.length === 0) {
    return null;
  }

  if (selectionConfig?.selectionMode === WorkflowSchemaSelectionMode.Single) {
    return { mode: WorkflowSessionSelectionMode.Single, item: items[0] };
  }

  return { mode: WorkflowSessionSelectionMode.List, items };
}

function getBrowseClassNames(isMultiEntityBrowse: boolean) {
  return {
    container: isMultiEntityBrowse
      ? `max-h-full min-h-0 flex-1 [grid-area:body] max-h-[calc(100vh-11.8rem-${WORKFLOW_BROWSE_USE_SELECTION_BAR_HEIGHT})]`
      : 'max-h-full min-h-0 flex-1 relative [grid-area:body]',
    miniView: isMultiEntityBrowse
      ? 'max-h-[calc(100vh-11rem)] [grid-area:mini-view] row-span-2 self-stretch'
      : 'max-h-[calc(100vh-11rem)] [grid-area:mini-view]',
    footer: 'flex shrink-0 justify-end bg-background px-4 py-3 [grid-area:footer]',
  };
}

function WorkflowNewBrowsePage({ activity, section, targetType }: WorkflowNewBrowsePageProps) {
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useWorkspace();
  const searchParams = useSearchParams();
  const { setBreadcrumbState } = useWorkflowBreadcrumbState();
  // confirm prerequisite → swap to the entity browser (lazy chunk + real fetch)
  // startTransition keeps the picker visible until that's ready, avoids an empty page + fallback flash
  const [isConfirmingPrerequisite, startPrerequisiteTransition] = useTransition();
  const [selectionsByType, setSelectionsByType] = useState<TWorkflowBrowseSelectionsByType>({});

  const { workflow, configurationInputs, selectionConfig, isLoading } = useWorkflowSelectionConfig({
    activity,
    targetType,
  });

  const isMultiEntityBrowse = isWorkflowMultiEntityBrowse({ selectionConfig });

  const selectionCountsByType = useMemo(
    () =>
      configurationInputs.reduce<Partial<Record<TExtendedEntitiesTypeDict, number>>>(
        (counts, input) => {
          counts[input.type] = selectionsByType[input.type]?.length ?? 0;
          return counts;
        },
        {}
      ),
    [configurationInputs, selectionsByType]
  );

  const totalSelectedCount = useMemo(
    () => Object.values(selectionCountsByType).reduce((sum, count) => sum + (count ?? 0), 0),
    [selectionCountsByType]
  );

  const defaultEntityType = useMemo(() => {
    return (
      getPrimaryConfigurationInput({ activity, targetType })?.type ??
      configurationInputs[0]?.type ??
      (workflow && !workflowHasMultipleSources(workflow) ? workflow.sourceType : null)
    );
  }, [activity, configurationInputs, targetType, workflow]);

  const [selectedEntityType, setSelectedEntityType] = useState<TExtendedEntitiesTypeDict | null>(
    null
  );

  const activeEntityType = selectedEntityType ?? defaultEntityType;

  const activeInput = useMemo(
    () => configurationInputs.find((input) => input.type === activeEntityType),
    [activeEntityType, configurationInputs]
  );

  // prerequisite selections, keyed by a *share key* so prerequisites can be shared or independent:
  //  - shared: entries declaring the same `prerequisite.shareKey` resolve to one key → picked once
  //  - independent: no `shareKey` → keyed by entity type, so each type picks its own
  // `confirmed` drives the loader; `draft` is the in-progress phase-1 selection.
  const [confirmedPrerequisiteByKey, setConfirmedPrerequisiteByKey] = useState<
    Record<string, TBrowsePrerequisiteValue>
  >({});
  const [draftPrerequisiteByKey, setDraftPrerequisiteByKey] = useState<
    Record<string, TBrowsePrerequisiteValue>
  >({});

  const resolvePrerequisiteKey = useCallback(
    (entityType: TExtendedEntitiesTypeDict | null | undefined): string | null => {
      if (!entityType) return null;
      const prerequisite = workflow?.browseConfig?.[entityType]?.prerequisite;
      if (!prerequisite) return null;
      return prerequisite.shareKey ?? entityType;
    },
    [workflow]
  );

  const activeBrowseEntry = activeEntityType
    ? workflow?.browseConfig?.[activeEntityType]
    : undefined;
  const activePrerequisiteConfig = activeBrowseEntry?.prerequisite;
  const activeLoader = activeBrowseEntry?.loader;
  const activePrerequisiteKey = resolvePrerequisiteKey(activeEntityType);
  const confirmedPrerequisite = activePrerequisiteKey
    ? (confirmedPrerequisiteByKey[activePrerequisiteKey] ?? null)
    : null;
  const draftPrerequisite = activePrerequisiteKey
    ? (draftPrerequisiteByKey[activePrerequisiteKey] ?? null)
    : null;
  const showPrerequisitePhase =
    Boolean(activePrerequisiteConfig?.required) && !confirmedPrerequisite;

  const isCustomLoader = activeLoader?.kind === 'custom';

  // custom loader: list query + matching facets query for the table
  const loaderListQueryFn = useMemo(
    () => (isCustomLoader ? activeLoader.build(confirmedPrerequisite) : undefined),
    [isCustomLoader, activeLoader, confirmedPrerequisite]
  );

  const loaderFacetsQueryFn = useMemo(
    () => (isCustomLoader ? activeLoader.facets?.build(confirmedPrerequisite) : undefined),
    [isCustomLoader, activeLoader, confirmedPrerequisite]
  );

  // when using a custom loader, stash the prerequisite id in the React Query cache key
  // switching prerequisites forces a fresh fetch, so don’t get
  // served stale stuff from the last pick
  // INTERNAL_QUERY_CACHE_PREFIX just tags this as a cache‑key‑only param: it stays in the key but
  // gets stripped before the HTTP request (see api‑client), so the backend never sees it
  const prerequisiteCacheKeyParam = useMemo<Record<string, unknown> | undefined>(
    () =>
      isCustomLoader && confirmedPrerequisite
        ? {
            [`${INTERNAL_QUERY_CACHE_PREFIX}prerequisite_type`]: confirmedPrerequisite.type,
            [`${INTERNAL_QUERY_CACHE_PREFIX}prerequisite_id`]: confirmedPrerequisite.id,
          }
        : undefined,
    [isCustomLoader, confirmedPrerequisite]
  );

  const handlePrerequisiteSelect = useCallback(
    (value: TBrowsePrerequisiteValue) => {
      if (!activePrerequisiteKey) return;
      setDraftPrerequisiteByKey((previous) => ({ ...previous, [activePrerequisiteKey]: value }));
    },
    [activePrerequisiteKey]
  );

  const handlePrerequisiteContinue = useCallback(() => {
    if (!activePrerequisiteKey || !draftPrerequisite) return;
    startPrerequisiteTransition(() => {
      setConfirmedPrerequisiteByKey((previous) => ({
        ...previous,
        [activePrerequisiteKey]: draftPrerequisite,
      }));
    });
  }, [activePrerequisiteKey, draftPrerequisite]);

  const handlePrerequisiteChange = useCallback(() => {
    if (!activePrerequisiteKey) return;
    setConfirmedPrerequisiteByKey((previous) => {
      const next = { ...previous };
      delete next[activePrerequisiteKey];
      return next;
    });
    // changing a (possibly shared) prerequisite invalidates rows picked under it, for every type
    // that resolves to the same key.
    const affectedTypes = new Set(
      configurationInputs
        .map((input) => input.type)
        .filter((type) => resolvePrerequisiteKey(type) === activePrerequisiteKey)
    );
    setSelectionsByType((previous) => {
      const next = { ...previous };
      for (const type of affectedTypes) {
        delete next[type];
      }
      return next;
    });
  }, [activePrerequisiteKey, configurationInputs, resolvePrerequisiteKey]);

  const activeSelectedRows = activeEntityType ? (selectionsByType[activeEntityType] ?? []) : [];

  const handleRowsSelected = useCallback(
    (rows: EntityCoreIdentifiableNamed[]) => {
      if (!activeEntityType) {
        return;
      }

      setSelectionsByType((previous) => {
        const currentRows = previous[activeEntityType] ?? [];

        if (
          rows.length === currentRows.length &&
          rows.every((row, index) => row.id === currentRows[index]?.id)
        ) {
          return previous;
        }

        return {
          ...previous,
          [activeEntityType]: rows,
        };
      });
    },
    [activeEntityType]
  );

  const shouldRedirectToConfigure =
    Boolean(workflow) &&
    !isLoading &&
    getWorkflowInitialStage({ workflow, selection: selectionConfig }) ===
      WorkflowInitialStageDict.Configure;

  useEffect(() => {
    if (!shouldRedirectToConfigure || !workflow) {
      return;
    }

    const sessionId = searchParams.get(WORKFLOW_SESSION_ID_SEARCH_PARAM) ?? undefined;

    navigate(
      buildScanConfigConfigureHref({
        activity,
        targetType,
        workspace: { virtualLabId, projectId },
        sessionId,
        standalone: workflow.configureRouting === WorkflowConfigureRoutingDict.Standalone,
      })
    );
  }, [
    activity,
    navigate,
    projectId,
    searchParams,
    shouldRedirectToConfigure,
    targetType,
    virtualLabId,
    workflow,
  ]);

  // header breadcrumb lives in the layout, not here, push step (prerequisite vs pick entities) +
  // active tab so it can label the trail correctly
  // leaving /new unmounts the provider and wipes state; no need to reset in this effect's cleanup
  useEffect(() => {
    setBreadcrumbState({
      phase:
        showPrerequisitePhase && activePrerequisiteConfig
          ? WorkflowBreadcrumbPhaseDict.Prerequisite
          : WorkflowBreadcrumbPhaseDict.Selection,
      activeEntityType,
    });
  }, [showPrerequisitePhase, activePrerequisiteConfig, activeEntityType, setBreadcrumbState]);

  // warm the lazy data-table chunk while the user is on the prerequisite step, so confirming
  // resolves near-instantly instead of waiting on a first-time chunk download
  useEffect(() => {
    if (showPrerequisitePhase) {
      void import('@/ui/segments/data-table');
    }
  }, [showPrerequisitePhase]);

  const handleEntityTypeSelect = useCallback((entityType: TExtendedEntitiesTypeDict) => {
    setSelectedEntityType(entityType);
  }, []);

  const entityTypeSelectorOptions = useMemo(
    () =>
      configurationInputs.map((input) => ({
        label: input.label ?? getEntityMeta(input.type)?.label ?? '',
        value: input.type,
        count: selectionCountsByType[input.type] ?? 0,
      })),
    [configurationInputs, selectionCountsByType]
  );

  const handleConfigureSelected = useCallback(() => {
    const payload = buildWorkflowBrowseSelectionPayload({
      selectionConfig,
      configurationInputs,
      selectionsByType,
      mergeBrowseSelectionIntoSingleGroup:
        workflow?.scanConfig?.configureBinding.mergeBrowseSelectionIntoSingleGroup,
    });

    if (!payload) {
      return;
    }

    navigate(
      buildScanConfigConfigureHref({
        activity,
        targetType,
        workspace: { virtualLabId, projectId },
        selection: payload,
        standalone: workflow?.configureRouting === WorkflowConfigureRoutingDict.Standalone,
      })
    );
  }, [
    activity,
    configurationInputs,
    navigate,
    projectId,
    selectionConfig,
    selectionsByType,
    targetType,
    virtualLabId,
    workflow?.configureRouting,
    workflow?.scanConfig?.configureBinding.mergeBrowseSelectionIntoSingleGroup,
  ]);

  if (isLoading || shouldRedirectToConfigure) {
    return null;
  }

  if (!workflow || !activeEntityType) {
    return notFound();
  }

  if (
    configurationInputs.length === 0 &&
    selectionConfig?.selectionMode === WorkflowSchemaSelectionMode.None
  ) {
    return notFound();
  }

  // prerequisite phase: the active input requires an prerequisite that hasn't been confirmed yet
  if (showPrerequisitePhase && activePrerequisiteConfig) {
    return (
      <WorkflowBrowsePrerequisite
        prerequisite={activePrerequisiteConfig}
        value={draftPrerequisite}
        onSelect={handlePrerequisiteSelect}
        onContinue={handlePrerequisiteContinue}
        pending={isConfirmingPrerequisite}
      />
    );
  }

  const tableSelectionType = selectionConfig?.tableSelectionType;
  const showEntityTypeSelector = configurationInputs.length > 1;
  const trackSelectionsByEntityType = showEntityTypeSelector && Boolean(tableSelectionType);
  const baseExtraQueryParams = activeInput?.filters ?? workflow.filters;
  const extraQueryParams =
    baseExtraQueryParams || prerequisiteCacheKeyParam
      ? { ...baseExtraQueryParams, ...prerequisiteCacheKeyParam }
      : undefined;
  const browseLayoutClassNames = getBrowseClassNames(isMultiEntityBrowse);

  return (
    <>
      <BrowseEntityScope
        requireMiniDetailView
        requireBrainRegion={workflow.requireSpecies}
        requireSpeciesSelector={workflow.requireSpecies}
        requireScopeSelector={workflow.requireScope}
        section={section}
        classNames={{
          container: browseLayoutClassNames.container,
          miniView: browseLayoutClassNames.miniView,
        }}
        dataType={activeEntityType}
        extraQueryParams={extraQueryParams}
        listQueryFn={loaderListQueryFn}
        facetsQueryFn={loaderFacetsQueryFn}
        mainTableProps={{
          selectionType: tableSelectionType,
          ...(isMultiEntityBrowse ? { keepSelectionOnScopeChange: true } : {}),
          ...(trackSelectionsByEntityType
            ? {
                selectedRows: activeSelectedRows,
                onRowsSelected: handleRowsSelected,
              }
            : {}),
        }}
        miniViewProps={{
          section,
          hideUseModelAction: isMultiEntityBrowse,
          workflowTargetType: targetType,
        }}
        requireEntityTypeSelector={{
          options: entityTypeSelectorOptions,
          value: activeEntityType,
          enabled: showEntityTypeSelector,
          onSelect: handleEntityTypeSelect,
        }}
      />
      {isMultiEntityBrowse && (
        <div
          id="workflow-browse-use-selection"
          data-testid="workflow-browse-use-selection"
          className={cn(browseLayoutClassNames.footer, 'items-end gap-3')}
        >
          {confirmedPrerequisite && (
            <div className="mr-auto flex items-center gap-2 text-neutral-5">
              <span className="truncate ">
                {activePrerequisiteConfig?.label}:{' '}
                <strong className="font-bold text-primary-9">
                  {confirmedPrerequisite.row.name}
                </strong>
              </span>
              <Button
                variant="link"
                className="h-8 px-2 underline"
                onClick={handlePrerequisiteChange}
              >
                Change
              </Button>
            </div>
          )}
          <Button
            rounded
            variant="default"
            disabled={totalSelectedCount === 0}
            className={cn(
              'h-12 min-w-64 px-10 text-lg font-bold shadow-skmp-s',
              'disabled:bg-neutral-2 disabled:text-neutral-4!'
            )}
            onClick={handleConfigureSelected}
          >
            Use selection {totalSelectedCount > 0 ? `(${totalSelectedCount})` : ''}
          </Button>
        </div>
      )}
    </>
  );
}

export function createWorkflowNewRoutePage(activity: TActivityValue, section: TWorkspaceSection) {
  function Page({
    params,
  }: ServerSideComponentProp<
    WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
    null
  >) {
    const { type } = use(params);
    const { type: targetType } = resolveExtendedTypeFromPathParamUrl({ pathParam: type });

    return <WorkflowNewBrowsePage activity={activity} section={section} targetType={targetType} />;
  }

  return Page;
}
