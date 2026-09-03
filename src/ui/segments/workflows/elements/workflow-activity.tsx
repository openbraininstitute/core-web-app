'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { parseAsString, type SingleParserBuilder, useQueryStates } from 'nuqs';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { DEFAULT_PAGE_MEDIUM_SIZE } from '@/constants';
import { resolveIonChannelModelingByCampaignId } from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import { createEntitycorePagedDataSource } from '@/features/data-grid/bindings/entitycore/data-source.paged';
import {
  createDefaultOperatorRegistry,
  GridActionType,
  GridController,
  SelectionMode,
} from '@/features/data-grid/core';
import { GridSearch } from '@/features/data-grid/host/grid-search';
import {
  createDefaultPersistence,
  DataGrid,
  layoutKeyFor,
  useGridStateSlice,
} from '@/features/data-grid/react';
import { AgGridRenderer } from '@/features/data-grid/renderers/aggrid';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { ActivityValues, getActivity, type TActivityValue } from '@/ui/segments/workflows/config';
import { ActivityAndTypeSelectors } from '@/ui/segments/workflows/elements/browse-header';
import {
  buildWorkflowActivityConfigurationHref,
  buildWorkflowActivityDetailResultsHref,
  buildWorkflowActivityDuplicateHref,
  canDuplicateWorkflowActivityRow,
  type TWorkflowActivityTableRow,
} from '@/ui/segments/workflows/elements/workflow-activity-actions';
import { buildWorkflowActivityCellRenderers } from '@/ui/segments/workflows/elements/workflow-activity-cells';
import { buildWorkflowActivitySchema } from '@/ui/segments/workflows/elements/workflow-activity-schema';
import { cn } from '@/utils/css-class';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IGridState } from '@/features/data-grid/core';

/**
 * Campaign and simulation types whose row offers no "View results" action.
 *
 * Their results are not reachable from a single generated entity — an e-feature extraction, for
 * instance, registers one task result per config rather than one entity for the campaign — so the
 * detail results route has nothing to open.
 */
export const NotAllowedResultsActionEntityTypes: TExtendedEntitiesTypeDict[] = [
  ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
  ExtendedEntitiesTypeDict.MicrocircuitSimulation,
  ExtendedEntitiesTypeDict.RegionCircuitSimulation,
  ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation,
  ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
  ExtendedEntitiesTypeDict.IonChannelModelSimulation,
  ExtendedEntitiesTypeDict.SkeletonizationCampaign,
  ExtendedEntitiesTypeDict.EFeatureExtractionCampaign,
];

/** Grid section id — namespaces the persisted column layout away from the browse pages. */
const WORKFLOW_ACTIVITY_SECTION = 'workflow-activity';

const selectFreeTextSearch = (state: IGridState): string => state.freeTextSearch;

/** One registry for every workflow-activity grid, so remounts resolve the same objects. */
const CELL_RENDERERS = buildWorkflowActivityCellRenderers();

export interface WorkflowActivityRef {
  dataCount: number;
  totalItems: number;
  entityType: TExtendedEntitiesTypeDict | undefined;
}

export type WorkflowActivityProps = {
  onActivityChange?: (activity: TActivityValue | undefined) => void;
  onEntityTypeChange?: (entityType: TExtendedEntitiesTypeDict | undefined) => void;
  onShouldRenderScrollableSelector: (shouldRenderScrollableSelector: boolean) => void;
  onShouldOnlyRenderScrollableSelector: (shouldRenderOnlyScrollableSelector: boolean) => void;
};

export function WorkflowActivity() {
  const { push: navigate } = useRouter();
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  const notification = useAppNotification();
  const queryParams = useSearchParams();
  const query = new URLSearchParams(queryParams);

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

  const [selectedRow, setSelectedRow] = useState<EntityCoreObjectTypes | undefined>(undefined);
  const [metaKey, setMetaKey] = useState(gridKey);
  const [isResolvingResults, setIsResolvingResults] = useState(false);

  // Reset on the key, not in the change handlers: both values also come from the URL, so
  // browser navigation swaps them without either handler running.
  if (metaKey !== gridKey) {
    setMetaKey(gridKey);
    setSelectedRow(undefined);
  }

  const activityName = getActivity(resolvedActivityType)?.name ?? '';

  const schema = useMemo(
    () =>
      buildWorkflowActivitySchema({
        activityName,
        entityType: resolvedEntityType,
        workspace,
      }),
    [activityName, resolvedEntityType, workspace]
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
      }),
    [resolvedEntityType, schema, virtualLabId, projectId]
  );

  const params = useMemo(
    () => ({ authorized_project_id: projectId, authorized_public: false }),
    [projectId]
  );

  const selectedRows = useMemo(() => (selectedRow ? [selectedRow] : []), [selectedRow]);
  const onSelectionChange = useCallback(
    (rows: EntityCoreObjectTypes[]) => setSelectedRow(rows.at(0)),
    []
  );

  const appendCurrentQueryParams = useCallback(
    (href: string) => {
      const currentQuery = query.toString();
      if (!currentQuery) {
        return href;
      }

      const separator = href.includes('?') ? '&' : '?';
      return `${href}${separator}${currentQuery}`;
    },
    [query]
  );

  const configurationHref = useMemo(() => {
    if (!entityType || !selectedRow) {
      return null;
    }

    const href = buildWorkflowActivityConfigurationHref({
      activity: resolvedActivityType,
      listEntityType: entityType,
      workspace,
      row: selectedRow as unknown as TWorkflowActivityTableRow,
    });

    return href ? appendCurrentQueryParams(href) : null;
  }, [appendCurrentQueryParams, entityType, resolvedActivityType, selectedRow, workspace]);

  const onViewIonChannelResults = useCallback(async () => {
    if (!selectedRow) return;
    setIsResolvingResults(true);
    try {
      const resolved = await resolveIonChannelModelingByCampaignId({
        id: selectedRow.id,
        context: { virtualLabId, projectId },
      });

      const modelId = resolved.generatedModelIds.at(0);

      if (modelId) {
        navigate(
          `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/view/ion-channel-model/${modelId}`
        );
      } else {
        notification.info({
          message: 'No ion channel model found',
          description: 'This campaign has not produced any ion channel model yet.',
        });
      }
    } finally {
      setIsResolvingResults(false);
    }
  }, [selectedRow, navigate, virtualLabId, projectId, notification]);

  const resultsLink = useMemo(() => {
    if (!entityType || !selectedRow) {
      return null;
    }

    return buildWorkflowActivityDetailResultsHref({
      workspace,
      listEntityType: entityType,
      rowId: selectedRow.id,
    });
  }, [entityType, selectedRow, workspace]);

  const isIonChannelModelingCampaign =
    entityType === ExtendedEntitiesTypeDict.IonChannelModelingCampaign;
  const isBuildActivity = activityType === ActivityValues.Build;
  const canShowResultsAction = Boolean(
    resultsLink && entityType && !NotAllowedResultsActionEntityTypes.includes(entityType)
  );
  const resultsActionLink = resultsLink ?? undefined;

  const onDuplicate = useCallback(() => {
    if (!selectedRow || !entityType) {
      return;
    }

    const href = buildWorkflowActivityDuplicateHref({
      activity: resolvedActivityType,
      listEntityType: entityType,
      workspace,
      row: selectedRow as unknown as TWorkflowActivityTableRow,
    });

    if (href) {
      navigate(href);
    }
  }, [entityType, navigate, resolvedActivityType, selectedRow, workspace]);

  const canDuplicate = useMemo(() => {
    if (!selectedRow || !entityType) {
      return false;
    }

    return canDuplicateWorkflowActivityRow({
      activity: resolvedActivityType,
      listEntityType: entityType,
      row: selectedRow as unknown as TWorkflowActivityTableRow,
    });
  }, [entityType, resolvedActivityType, selectedRow]);

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
        <div
          className="flex h-full w-full min-h-0 flex-col"
          id="workflow-activities-full-table"
          data-testid="workflow-activities-full-table"
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
            selection={{
              mode: SelectionMode.Single,
              selectedRows,
              onChange: onSelectionChange,
            }}
            toolbarSlots={{
              entityType: (
                <ActivityAndTypeSelectors
                  activity={activityType}
                  entityType={entityType}
                  onActivityChange={(activityType) => updateActivityState({ activityType })}
                  onEntityTypeChange={(entityType) => updateActivityState({ entityType })}
                />
              ),
              search: <GridSearch onSearch={handleSearch} openOnMount value={freeTextSearch} />,
            }}
          />
          <div className="relative flex h-15 w-full items-end justify-end">
            {selectedRow && configurationHref && (
              <div className="flex h-15 shrink-0 items-center justify-center gap-2">
                <Button
                  rounded
                  asChild
                  variant="outline"
                  size={breakpoint === 'l' ? 'md' : 'lg'}
                  className="select-none"
                >
                  <Link href={configurationHref} className="text-primary-9! hover:text-white!">
                    View configuration
                  </Link>
                </Button>
                {canShowResultsAction &&
                  resultsActionLink &&
                  (isIonChannelModelingCampaign ? (
                    <Button
                      rounded
                      variant="outline"
                      size={breakpoint === 'l' ? 'md' : 'lg'}
                      disabled={isResolvingResults}
                      onClick={onViewIonChannelResults}
                      className="disabled:bg-background! disabled:text-label! select-none disabled:cursor-not-allowed"
                    >
                      {isResolvingResults && <LoadingOutlined />}
                      <span>View results</span>
                    </Button>
                  ) : (
                    <Button
                      rounded
                      asChild={!isBuildActivity}
                      variant="outline"
                      size={breakpoint === 'l' ? 'md' : 'lg'}
                      disabled={isBuildActivity}
                      className="disabled:bg-background! disabled:text-label! select-none disabled:cursor-not-allowed group"
                    >
                      <Link
                        href={resultsActionLink}
                        aria-disabled={isBuildActivity}
                        className="text-primary-9! hover:text-white!"
                      >
                        View results
                      </Link>
                    </Button>
                  ))}
                <Button
                  rounded
                  variant="outline"
                  size={breakpoint === 'l' ? 'md' : 'lg'}
                  onClick={onDuplicate}
                  className="disabled:bg-background disabled:text-label select-none disabled:cursor-not-allowed text-primary-9! hover:text-white!"
                  disabled={!canDuplicate}
                >
                  Duplicate
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
