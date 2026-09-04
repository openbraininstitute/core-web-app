'use client';

import { parseAsString, type SingleParserBuilder, useQueryStates } from 'nuqs';
import { useCallback, useEffect, useMemo } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
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
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { ActivityValues, getActivity, type TActivityValue } from '@/ui/segments/workflows/config';
import { ActivityAndTypeSelectors } from '@/ui/segments/workflows/elements/browse-header';
import { buildWorkflowActivityCellRenderers } from '@/ui/segments/workflows/elements/workflow-activity-cells';
import { buildWorkflowActivitySchema } from '@/ui/segments/workflows/elements/workflow-activity-schema';
import { withWorkflowIdSearch } from '@/ui/segments/workflows/elements/workflow-activity-search';
import { cn } from '@/utils/css-class';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IGridState } from '@/features/data-grid/core';

/** Grid section id — namespaces the persisted column layout away from the browse pages. */
const WORKFLOW_ACTIVITY_SECTION = 'workflow-activity';

const selectFreeTextSearch = (state: IGridState): string => state.freeTextSearch;

/** One registry for every workflow-activity grid, so remounts resolve the same objects. */
const CELL_RENDERERS = buildWorkflowActivityCellRenderers();

export function WorkflowActivity() {
  const { virtualLabId, projectId } = useWorkspace();

  const [{ activityType, entityType }, updateActivityState] = useQueryStates(
    {
      activityType: parseAsString
        .withOptions({
          clearOnDefault: false,
          shallow: true,
        })
        .withDefault(ActivityValues.Build) as SingleParserBuilder<TActivityValue>,
      entityType: parseAsString
        .withOptions({
          clearOnDefault: false,
          shallow: true,
        })
        .withDefault(
          ExtendedEntitiesTypeDict.Memodel
        ) as SingleParserBuilder<TExtendedEntitiesTypeDict>,
    },
    {
      urlKeys: {
        activityType: 'tactivity',
        entityType: 'ttype',
      },
    }
  );

  const resolvedActivityType: TActivityValue =
    activityType ?? (ActivityValues.Build as TActivityValue);
  const resolvedEntityType: TExtendedEntitiesTypeDict =
    entityType ?? ExtendedEntitiesTypeDict.Memodel;

  const workspace = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);

  const gridKey = `${resolvedActivityType}-${resolvedEntityType}`;

  const activityName = getActivity(resolvedActivityType)?.name ?? '';

  const schema = useMemo(
    () =>
      buildWorkflowActivitySchema({
        activity: resolvedActivityType,
        activityName,
        entityType: resolvedEntityType,
        workspace,
      }),
    [resolvedActivityType, activityName, resolvedEntityType, workspace]
  );

  const operators = useMemo(() => createDefaultOperatorRegistry(), []);

  const controller = useMemo(
    () =>
      new GridController<EntityCoreObjectTypes>({
        schema,
        context: {
          dataType: resolvedEntityType,
          section: WORKFLOW_ACTIVITY_SECTION,
          factors: { activity: resolvedActivityType },
        },
        instanceKey: `${WORKFLOW_ACTIVITY_SECTION}:${virtualLabId}:${projectId}:${gridKey}`,
        // The layout slice is keyed by section + entity type only, so a chosen column
        // set follows the type across projects the way the browse listings do.
        persistence: createDefaultPersistence(
          layoutKeyFor(WORKFLOW_ACTIVITY_SECTION, resolvedEntityType)
        ),
        defaultPageSize: DEFAULT_PAGE_MEDIUM_SIZE,
      }),
    [schema, resolvedEntityType, resolvedActivityType, virtualLabId, projectId, gridKey]
  );
  useEffect(() => controller.connect(), [controller]);

  const handleSearch = useCallback(
    (text: string) => controller.store.dispatch({ type: GridActionType.SetFreeTextSearch, text }),
    [controller]
  );
  const freeTextSearch = useGridStateSlice(controller, selectFreeTextSearch);

  // The grid contributes page/sort/filter/search; the entity's domain config owns the
  // endpoint, and `params` below pins the workspace scope.
  const dataSource = useMemo(
    () =>
      createEntitycorePagedDataSource<EntityCoreObjectTypes>({
        dataType: resolvedEntityType,
        schema,
        context: { virtualLabId, projectId },
        // workflow-only: a pasted UUID in the search box looks up that record by id
        transformParams: withWorkflowIdSearch,
      }),
    [resolvedEntityType, schema, virtualLabId, projectId]
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
          queryKey={['workflow-activity', virtualLabId, projectId, gridKey]}
          params={params}
          enabled={Boolean(resolvedActivityType && resolvedEntityType)}
          loadingLabel="activities"
          className="min-h-0 flex-1"
          gridClassName="[&_.ag-header]:bg-background [&_.ag-header-cell]:text-neutral-4"
          toolbarSlots={{
            entityType: (
              <ActivityAndTypeSelectors
                activity={activityType}
                entityType={entityType}
                onActivityChange={(activityType) => updateActivityState({ activityType })}
                onEntityTypeChange={(entityType) => updateActivityState({ entityType })}
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
