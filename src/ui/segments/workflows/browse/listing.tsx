'use client';

import { useRouter } from '@bprogress/next';
import { notFound, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { WorkflowInitializeSelectionMode } from '@/features/scan-config/schema/types';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { useScope } from '@/ui/hooks/use-scope';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import {
  buildScanConfigConfigureHref,
  getEntityMeta,
  getPrimaryConfigurationInput,
  getWorkflowInitialStage,
  isMultipleWorkflowSource,
  WORKFLOW_SESSION_ID_SEARCH_PARAM,
  WorkflowConfigureRoutingDict,
} from '@/ui/segments/workflows/config';
import {
  buildWorkflowBrowseSelectionPayload,
  getWorkflowBrowseSelectionCounts,
  getWorkflowBrowseTotalSelectedCount,
  isWorkflowMultiEntityBrowse,
  type TWorkflowBrowseSelectionsByType,
} from '@/ui/segments/workflows/hooks/use-workflow-browse-multi-selection';
import { useWorkflowSelectionConfig } from '@/ui/segments/workflows/hooks/use-workflow-selection-config';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { TWorkspaceSection } from '@/constants';
import type { TActivityValue } from '@/ui/segments/workflows/config/types';

type WorkflowNewBrowsePageProps = {
  activity: TActivityValue;
  section: TWorkspaceSection;
  targetType: TExtendedEntitiesTypeDict;
};

/** height reserved for the multi-entity "Use selection" footer in workflow browse grids. */
export const WORKFLOW_BROWSE_USE_SELECTION_BAR_HEIGHT = '4.5rem';

export function getWorkflowBrowseLayoutClassNames(isMultiEntityBrowse: boolean) {
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

export function WorkflowNewBrowsePage({
  activity,
  section,
  targetType,
}: WorkflowNewBrowsePageProps) {
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useWorkspace();
  const searchParams = useSearchParams();
  const { scope } = useScope();
  const [selectionsByType, setSelectionsByType] = useState<TWorkflowBrowseSelectionsByType>({});

  const { workflow, configurationInputs, selectionConfig, isLoading } = useWorkflowSelectionConfig({
    activity,
    targetType,
  });

  const isMultiEntityBrowse = isWorkflowMultiEntityBrowse({ selectionConfig });

  const selectionCountsByType = useMemo(
    () => getWorkflowBrowseSelectionCounts(configurationInputs, selectionsByType),
    [configurationInputs, selectionsByType]
  );

  const totalSelectedCount = useMemo(
    () => getWorkflowBrowseTotalSelectedCount(selectionCountsByType),
    [selectionCountsByType]
  );

  const prevScopeRef = useRef(scope);

  useEffect(() => {
    if (!isMultiEntityBrowse || prevScopeRef.current === scope) {
      return;
    }

    prevScopeRef.current = scope;
    setSelectionsByType({});
  }, [isMultiEntityBrowse, scope]);

  const defaultEntityType = useMemo(() => {
    return (
      getPrimaryConfigurationInput({ activity, targetType })?.type ??
      configurationInputs[0]?.type ??
      (workflow && !isMultipleWorkflowSource(workflow.sourceType) ? workflow.sourceType : null)
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

      setSelectionsByType((previous) => ({
        ...previous,
        [activeEntityType]: rows,
      }));
    },
    [activeEntityType]
  );

  const shouldRedirectToConfigure =
    Boolean(workflow) &&
    !isLoading &&
    getWorkflowInitialStage({ workflow, selection: selectionConfig }) === 'configure';

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

  const handleConfigureSelected = () => {
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
  };

  if (isLoading || shouldRedirectToConfigure) {
    return null;
  }

  if (!workflow || !activeEntityType) {
    return notFound();
  }

  if (
    configurationInputs.length === 0 &&
    selectionConfig?.selectionMode === WorkflowInitializeSelectionMode.None
  ) {
    return notFound();
  }

  const tableSelectionType = selectionConfig?.tableSelectionType;
  const extraQueryParams = activeInput?.filters ?? workflow.filters ?? undefined;
  const browseLayoutClassNames = getWorkflowBrowseLayoutClassNames(isMultiEntityBrowse);

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
          ...(isMultiEntityBrowse
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
          options: configurationInputs.map((input) => ({
            label: input.label ?? getEntityMeta(input.type)?.label ?? '',
            value: input.type,
            count: selectionCountsByType[input.type] ?? 0,
          })),
          value: activeEntityType,
          enabled: configurationInputs.length > 1,
          onSelect: (entityType) => setSelectedEntityType(entityType),
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
