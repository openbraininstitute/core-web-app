'use client';

import { useRouter } from '@bprogress/next';
import { notFound, useSearchParams } from 'next/navigation';
import { use, useCallback, useEffect, useMemo, useState } from 'react';

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
import { useWorkflowSelectionConfig } from '@/ui/segments/workflows/browse/use-workflow-selection-config';
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
import { cn } from '@/utils/css-class';
import { resolveExtendedTypeFromPathParamUrl } from '@/utils/url-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { TWorkspaceSection } from '@/constants';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type {
  IWorkflowConfigurationInput,
  TActivityValue,
} from '@/ui/segments/workflows/config/types';
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

  const tableSelectionType = selectionConfig?.tableSelectionType;
  const showEntityTypeSelector = configurationInputs.length > 1;
  const trackSelectionsByEntityType = showEntityTypeSelector && Boolean(tableSelectionType);
  const extraQueryParams = activeInput?.filters ?? workflow.filters ?? undefined;
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
          className={browseLayoutClassNames.footer}
        >
          <Button
            rounded
            variant="default"
            disabled={totalSelectedCount === 0}
            className={cn('h-12 min-w-64 px-10 text-lg font-bold shadow-skmp-s')}
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
