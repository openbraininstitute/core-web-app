'use client';

import { parseAsString, type SingleParserBuilder, useQueryStates } from 'nuqs';
import { useCallback, useEffect, useMemo } from 'react';

import { DEFAULT_PAGE_MEDIUM_SIZE } from '@/constants';
import { createEntitycorePagedDataSource } from '@/features/data-grid/bindings/entitycore/data-source.paged';
import {
  createDefaultOperatorRegistry,
  GridActionType,
  GridController,
} from '@/features/data-grid/core';
import { GridSearch } from '@/features/data-grid/host/grid-search';
import {
  createDefaultPersistence,
  DataGrid,
  layoutKeyFor,
  useGridStateSlice,
} from '@/features/data-grid/react';
import { AgGridRenderer } from '@/features/data-grid/renderers/aggrid';
import { useFlags } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { getActivity, type TActivityValue } from '@/ui/segments/workflows/config';
import { ActivityAndTypeSelectors } from '@/ui/segments/workflows/elements/browse-header';
import {
  ALL_WORKFLOWS,
  allWorkflowsSources,
  createAllWorkflowsDataSource,
  type TAllWorkflows,
} from '@/ui/segments/workflows/elements/workflow-activity-all';
import {
  buildWorkflowActivityCellRenderers,
  WORKFLOW_ACTIVITY_QUERY_KEY,
  WorkflowHoverCard,
} from '@/ui/segments/workflows/elements/workflow-activity-cells';
import { buildWorkflowActivitySchema } from '@/ui/segments/workflows/elements/workflow-activity-schema';
import { withWorkflowIdSearch } from '@/ui/segments/workflows/elements/workflow-activity-search';
import { cn } from '@/utils/css-class';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IGridState } from '@/features/data-grid/core';

/** Grid section id — namespaces the persisted column layout away from the browse pages. */
const WORKFLOW_ACTIVITY_SECTION = 'workflow-activity';
/**
 * Where the column layout is saved. Versioned because a saved order or width outranks the
 * declared one: v3 has Category and Type first and fits every column to its content.
 */
const WORKFLOW_ACTIVITY_LAYOUT = `${WORKFLOW_ACTIVITY_SECTION}-v3`;

const selectFreeTextSearch = (state: IGridState): string => state.freeTextSearch;

const renderHoverCard = (row: EntityCoreObjectTypes) => <WorkflowHoverCard row={row} />;

/** One registry for every workflow-activity grid, so remounts resolve the same objects. */
const CELL_RENDERERS = buildWorkflowActivityCellRenderers();

export function WorkflowActivity() {
  const { virtualLabId, projectId } = useWorkspace();
  const flags = useFlags();

  const [{ activityType, entityType }, updateActivityState] = useQueryStates(
    {
      activityType: parseAsString
        .withOptions({
          clearOnDefault: false,
          shallow: true,
        })
        .withDefault(ALL_WORKFLOWS) as SingleParserBuilder<TActivityValue | TAllWorkflows>,
      entityType: parseAsString
        .withOptions({
          clearOnDefault: false,
          shallow: true,
        })
        .withDefault(ALL_WORKFLOWS) as SingleParserBuilder<
        TExtendedEntitiesTypeDict | TAllWorkflows
      >,
    },
    {
      urlKeys: {
        activityType: 'tactivity',
        entityType: 'ttype',
      },
    }
  );

  // All on either side lists every workflow: a type cannot narrow All, nor All a category
  const all = activityType === ALL_WORKFLOWS || entityType === ALL_WORKFLOWS;
  const listedActivity = all ? undefined : (activityType as TActivityValue);
  const listedType = all ? undefined : (entityType as TExtendedEntitiesTypeDict);

  const workspace = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);

  const gridKey = all ? ALL_WORKFLOWS : `${listedActivity}-${listedType}`;
  const layoutType = listedType ?? ALL_WORKFLOWS;

  const activityName = listedActivity ? (getActivity(listedActivity)?.name ?? '') : '';

  const schema = useMemo(
    () =>
      buildWorkflowActivitySchema({
        activity: listedActivity,
        activityName,
        entityType: listedType,
        workspace,
      }),
    [listedActivity, activityName, listedType, workspace]
  );

  const operators = useMemo(() => createDefaultOperatorRegistry(), []);

  const controller = useMemo(
    () =>
      new GridController<EntityCoreObjectTypes>({
        schema,
        context: {
          dataType: layoutType,
          section: WORKFLOW_ACTIVITY_SECTION,
          factors: { activity: listedActivity ?? ALL_WORKFLOWS },
        },
        instanceKey: `${WORKFLOW_ACTIVITY_SECTION}:${virtualLabId}:${projectId}:${gridKey}`,
        // The layout slice is keyed by section + entity type only, so a chosen column
        // set follows the type across projects the way the browse listings do.
        persistence: createDefaultPersistence(layoutKeyFor(WORKFLOW_ACTIVITY_LAYOUT, layoutType)),
        defaultPageSize: DEFAULT_PAGE_MEDIUM_SIZE,
      }),
    [schema, layoutType, listedActivity, virtualLabId, projectId, gridKey]
  );
  useEffect(() => controller.connect(), [controller]);

  const handleSearch = useCallback(
    (text: string) => controller.store.dispatch({ type: GridActionType.SetFreeTextSearch, text }),
    [controller]
  );
  const freeTextSearch = useGridStateSlice(controller, selectFreeTextSearch);

  // The grid contributes page/sort/filter/search; the entity's domain config owns the
  // endpoint (All asks each workflow's), and `params` below pins the workspace scope.
  const dataSource = useMemo(
    () =>
      listedType
        ? createEntitycorePagedDataSource<EntityCoreObjectTypes>({
            dataType: listedType,
            schema,
            context: { virtualLabId, projectId },
            // workflow-only: a pasted UUID in the search box looks up that record by id
            transformParams: withWorkflowIdSearch,
          })
        : createAllWorkflowsDataSource({
            sources: allWorkflowsSources(flags),
            schema,
            context: { virtualLabId, projectId },
            transformParams: withWorkflowIdSearch,
          }),
    [listedType, schema, virtualLabId, projectId, flags]
  );

  const params = useMemo(
    () => ({ authorized_project_id: projectId, authorized_public: false }),
    [projectId]
  );

  return (
    <section
      id="activity-table-with-filters"
      data-testid="activity-table-with-filters"
      className={cn('flex h-full w-full min-w-0 flex-col before:shadow-lg after:shadow-md')}
    >
      <div
        className="flex h-full w-full min-h-0 flex-col"
        id="workflow-activities-table"
        data-testid="workflow-activities-table"
      >
        <DataGrid<EntityCoreObjectTypes>
          key={gridKey}
          controller={controller}
          dataSource={dataSource}
          renderer={AgGridRenderer}
          operators={operators}
          cellRenderers={CELL_RENDERERS}
          queryKey={[WORKFLOW_ACTIVITY_QUERY_KEY, virtualLabId, projectId, gridKey]}
          params={params}
          enabled={all || Boolean(listedActivity && listedType)}
          loadingLabel="activities"
          rowHoverCard={renderHoverCard}
          className="min-h-0 flex-1"
          gridClassName="[&_.ag-header]:bg-background [&_.ag-header-cell]:text-neutral-4"
          toolbarSlots={{
            entityType: (
              <ActivityAndTypeSelectors
                activity={all ? ALL_WORKFLOWS : activityType}
                entityType={all ? ALL_WORKFLOWS : entityType}
                onActivityChange={(activityType) => updateActivityState({ activityType })}
                onEntityTypeChange={(entityType) => updateActivityState({ entityType })}
                onAllSelect={() =>
                  updateActivityState({ activityType: ALL_WORKFLOWS, entityType: ALL_WORKFLOWS })
                }
              />
            ),
            search: (
              <GridSearch
                openOnMount
                onSearch={handleSearch}
                value={freeTextSearch}
                // wider than the default so the whole hint is readable
                inputWidthClass="w-96"
                placeholder="Search entities by name, ID"
              />
            ),
          }}
        />
      </div>
    </section>
  );
}
