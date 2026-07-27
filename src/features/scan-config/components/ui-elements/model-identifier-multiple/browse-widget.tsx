'use client';

import { CloseOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import { INTERNAL_QUERY_CACHE_PREFIX } from '@/constants';
import { ModelIdentifierEntityCard } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/entity-card';
import {
  countSelectedEntities,
  mergeConfigurationInputs,
  selectionsByTypeToFromIdRefs,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple/helpers';
import {
  ModelIdentifierSelectionCart,
  SelectionConfirmActions,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple/selection-cart';
import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import { getEntityTypeTagLabel } from '@/features/scan-config/helpers';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { Button } from '@/ui/molecules/button';
import { useMiniDetailView } from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { TWorkspaceSection } from '@/constants';
import type { TModelIdentifierBrowseSelectionsByType } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/types';
import type { TFromIdRef } from '@/features/scan-config/helpers';
import type { TWorkflowSessionPrerequisites } from '@/features/scan-config/workflow/workflow-session-selection';
import type { WorkspaceContext } from '@/types/common';
import type {
  TBrowsePrerequisiteValue,
  TWorkflowBrowseConfig,
} from '@/ui/segments/workflows/browse/browse-config';
import type { TScanConfigConfigureBinding } from '@/ui/segments/workflows/config/scan-config-binding';
import type { IWorkflowConfigurationInput } from '@/ui/segments/workflows/config/types';

/**
 * how many entities the browse widget commits. `Single` (used by
 * `model_selector_single`) swaps checkboxes for radios and replaces the
 * selection cart with an inline action bar; `Multiple` keeps the cart.
 */
export const ModelIdentifierBrowseWidgetSelectionMode = {
  Single: 'single',
  Multiple: 'multiple',
} as const;

export type TModelIdentifierBrowseWidgetSelectionMode =
  (typeof ModelIdentifierBrowseWidgetSelectionMode)[keyof typeof ModelIdentifierBrowseWidgetSelectionMode];

type TProps = {
  title: string;
  fieldSchema: Record<string, unknown>;
  initialRefs: readonly TFromIdRef[];
  initialGroupName?: string;
  showGroupName?: boolean;
  selectionMode?: TModelIdentifierBrowseWidgetSelectionMode;
  configurationInputs?: readonly IWorkflowConfigurationInput[];
  configureBinding?: TScanConfigConfigureBinding;
  workspaceSection: TWorkspaceSection;
  workspace: WorkspaceContext;
  sessionRefs?: readonly { type: TExtendedEntitiesTypeDict; id: string }[];
  requireSpecies?: boolean;
  /** per-type browse rules; a custom loader scopes rows to the prerequisite (e.g. EM dataset) */
  browseConfig?: TWorkflowBrowseConfig;
  /** prerequisites picked during browse, keyed by share-key; used to rebuild the filtered loader */
  prerequisites?: TWorkflowSessionPrerequisites;
  disabled?: boolean;
  onConfirm: (refs: TFromIdRef[], groupName?: string) => void;
  onCancel: () => void;
};

function groupEntitiesByType(
  entities: Array<EntityCoreIdentifiableNamed & { entityType: TExtendedEntitiesTypeDict }>
): TModelIdentifierBrowseSelectionsByType {
  return entities.reduce<TModelIdentifierBrowseSelectionsByType>((accumulator, entity) => {
    const current = accumulator[entity.entityType] ?? [];
    accumulator[entity.entityType] = [...current, entity];
    return accumulator;
  }, {});
}

/** first staged entity across all types, or undefined — used by the single-select action bar */
function firstSelectedEntity(
  selectionsByType: TModelIdentifierBrowseSelectionsByType
): { entityType: TExtendedEntitiesTypeDict; entity: EntityCoreIdentifiableNamed } | undefined {
  for (const [entityType, rows] of Object.entries(selectionsByType)) {
    const entity = rows?.[0];
    if (entity) {
      return { entityType: entityType as TExtendedEntitiesTypeDict, entity };
    }
  }
  return undefined;
}

export function ModelIdentifierBrowseWidget({
  title,
  fieldSchema,
  initialRefs,
  initialGroupName = 'Default name',
  showGroupName = false,
  selectionMode = ModelIdentifierBrowseWidgetSelectionMode.Multiple,
  configurationInputs,
  configureBinding,
  workspaceSection,
  workspace,
  sessionRefs,
  requireSpecies = false,
  browseConfig,
  prerequisites,
  disabled,
  onConfirm,
  onCancel,
}: TProps) {
  const instanceId = useId();
  const { mdv } = useMiniDetailView();
  const isSingleSelect = selectionMode === ModelIdentifierBrowseWidgetSelectionMode.Single;
  const mergedInputs = useMemo(
    () => mergeConfigurationInputs({ paramSchema: fieldSchema, configurationInputs }),
    [configurationInputs, fieldSchema]
  );

  const [selectedEntityType, setSelectedEntityType] = useState<TExtendedEntitiesTypeDict | null>(
    mergedInputs[0]?.type ?? null
  );
  const [groupName, setGroupName] = useState(initialGroupName);
  const [selectionsByType, setSelectionsByType] = useState<TModelIdentifierBrowseSelectionsByType>(
    {}
  );
  const [hasSeededSelections, setHasSeededSelections] = useState(false);

  const { entities: hydratedEntities, isLoading } = useResolvedModelIdentifierEntities({
    refs: initialRefs,
    sessionRefs,
    context: workspace,
  });

  useEffect(() => {
    if (hasSeededSelections || isLoading) {
      return;
    }

    setSelectionsByType(groupEntitiesByType(hydratedEntities));
    setHasSeededSelections(true);
  }, [hasSeededSelections, hydratedEntities, isLoading]);

  const activeEntityType = selectedEntityType ?? mergedInputs[0]?.type ?? null;
  const activeInput = mergedInputs.find((input) => input.type === activeEntityType);
  const activeSelectedRows = activeEntityType ? (selectionsByType[activeEntityType] ?? []) : [];
  const selectedCount = countSelectedEntities(selectionsByType);

  // custom loader = same dataset-scoped query the /new page used (e.g. EM cell morphologies
  // derived from the chosen reconstruction dataset). when present we replace the base-entity
  // query and hide the species/filter controls it can't honor, keeping only the scope selector.
  const activeLoader = activeEntityType ? browseConfig?.[activeEntityType]?.loader : undefined;
  const isCustomLoader = activeLoader?.kind === 'custom';

  // prerequisites are persisted keyed by entity type, so this is a direct lookup
  const activePrerequisite = activeEntityType ? prerequisites?.[activeEntityType] : undefined;

  const prerequisiteValue = useMemo<TBrowsePrerequisiteValue | null>(
    () =>
      activePrerequisite
        ? {
            type: activePrerequisite.type,
            id: activePrerequisite.id,
            row: {
              id: activePrerequisite.id,
              name: activePrerequisite.name ?? '',
            } as EntityCoreIdentifiableNamed,
          }
        : null,
    [activePrerequisite]
  );

  const loaderListQueryFn = useMemo(
    () => (isCustomLoader ? activeLoader.build(prerequisiteValue) : undefined),
    [isCustomLoader, activeLoader, prerequisiteValue]
  );
  const loaderFacetsQueryFn = useMemo(
    () => (isCustomLoader ? activeLoader.facets?.build(prerequisiteValue) : undefined),
    [isCustomLoader, activeLoader, prerequisiteValue]
  );

  // tag the query cache with the prerequisite id (stripped before the HTTP request) so switching
  // datasets refetches and matches the /new page cache
  const extraQueryParams = useMemo(() => {
    if (!isCustomLoader || !activePrerequisite) {
      return activeInput?.filters;
    }
    return {
      ...activeInput?.filters,
      [`${INTERNAL_QUERY_CACHE_PREFIX}prerequisite_type`]: activePrerequisite.type,
      [`${INTERNAL_QUERY_CACHE_PREFIX}prerequisite_id`]: activePrerequisite.id,
    };
  }, [activeInput?.filters, isCustomLoader, activePrerequisite]);

  const entityTypeSelectorOptions = useMemo(
    () =>
      mergedInputs.map((input) => ({
        label: input.label,
        value: input.type,
        count: selectionsByType[input.type]?.length ?? 0,
      })),
    [mergedInputs, selectionsByType]
  );

  const handleRowsSelected = useCallback(
    (rows: EntityCoreIdentifiableNamed[]) => {
      if (!activeEntityType) {
        return;
      }

      setSelectionsByType((previous) => {
        // single-select is exclusive across type tabs too: picking a row in one
        // tab drops whatever was staged in another
        if (isSingleSelect) {
          return { [activeEntityType]: rows.slice(-1) };
        }

        return { ...previous, [activeEntityType]: rows };
      });
    },
    [activeEntityType, isSingleSelect]
  );

  const handleRemoveEntity = useCallback(
    (entityType: TExtendedEntitiesTypeDict, entityId: string) => {
      setSelectionsByType((previous) => ({
        ...previous,
        [entityType]: (previous[entityType] ?? []).filter((row) => row.id !== entityId),
      }));
    },
    []
  );

  const handleConfirm = useCallback(() => {
    const refs = selectionsByTypeToFromIdRefs(selectionsByType, configureBinding);
    onConfirm(refs, showGroupName ? groupName : undefined);
  }, [configureBinding, groupName, onConfirm, selectionsByType, showGroupName]);

  if (!activeEntityType) {
    return null;
  }

  // the cart is a multi-select concept, and it has nowhere to sit beside the
  // mini detail view — the inline action bar carries confirm/cancel in both cases
  const showCart = !isSingleSelect && !mdv;
  const stagedSingle = isSingleSelect ? firstSelectedEntity(selectionsByType) : undefined;

  return (
    <div
      className={cn(
        'grid h-full min-h-0 gap-3 overflow-hidden bg-gray-50 rounded-2xl border border-gray-50',
        {
          'grid-cols-1': !showCart,
          'grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]': showCart,
        }
      )}
    >
      {showCart ? (
        <ModelIdentifierSelectionCart
          title={title}
          selectionsByType={selectionsByType}
          onRemoveEntity={handleRemoveEntity}
          groupName={showGroupName ? groupName : undefined}
          onGroupNameChange={setGroupName}
          disabled={disabled}
          confirmDisabled={selectedCount === 0}
          onConfirm={handleConfirm}
          onCancel={onCancel}
          className="h-full"
        />
      ) : null}

      <div className="relative flex min-h-0 flex-col overflow-hidden bg-white pl-0">
        <Button
          type="button"
          variant="ghost"
          className="absolute top-1 right-0 z-20 size-8 rounded-full hover:bg-white"
          onClick={onCancel}
          aria-label="Close selection"
        >
          <CloseOutlined className="text-primary-8" />
        </Button>

        <div
          className={cn('grid min-h-0 flex-1 gap-2 overflow-hidden', {
            "grid-cols-[minmax(0,1fr)_minmax(30rem,44rem)] [grid-template-areas:'body_mini-view']":
              mdv,
            "grid-cols-1 [grid-template-areas:'body']": !mdv,
          })}
        >
          <BrowseEntityScope
            id={instanceId}
            requireMiniDetailView
            requireBrainRegion={requireSpecies && !isCustomLoader}
            requireSpeciesSelector={requireSpecies && !isCustomLoader}
            requireScopeSelector
            allowFilter={!isCustomLoader}
            section={workspaceSection}
            dataType={activeEntityType}
            extraQueryParams={extraQueryParams}
            listQueryFn={loaderListQueryFn}
            facetsQueryFn={loaderFacetsQueryFn}
            mainTableProps={{
              selectionType: isSingleSelect ? 'radio' : 'checkbox',
              selectedRows: activeSelectedRows,
              onRowsSelected: handleRowsSelected,
              keepSelectionOnScopeChange: true,
              // single mirrors the old model_selector_single modal, which opened
              // the table search on mount
              searchOpenOnMount: isSingleSelect,
            }}
            requireEntityTypeSelector={{
              options: entityTypeSelectorOptions,
              value: activeEntityType,
              enabled: mergedInputs.length > 1,
              onSelect: setSelectedEntityType,
            }}
            miniViewProps={{
              section: workspaceSection,
              hideUseModelAction: true,
            }}
            classNames={{
              container:
                'h-full max-h-full min-h-0 w-full min-w-0 overflow-hidden rounded-2xl bg-gray-50 [grid-area:body]',
              miniView:
                'h-full max-h-full min-h-0 w-full min-w-0 overflow-hidden [grid-area:mini-view]',
            }}
          />
        </div>

        {showCart ? null : (
          <div
            className={cn(
              'z-10 flex shrink-0 items-center justify-between gap-4 px-3 py-2',
              'border-t border-gray-200 bg-white'
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {stagedSingle ? (
                <ModelIdentifierEntityCard
                  variant="selection"
                  className="w-auto max-w-md"
                  blockElement={`${ScanConfigUIElementDict.ModelSelectorSingle}-selection`}
                  instanceId={`action-bar-${stagedSingle.entity.id}`}
                  entityName={stagedSingle.entity.name}
                  typeLabel={getEntityTypeTagLabel(stagedSingle.entityType)}
                  disabled={disabled}
                  showRemove={false}
                />
              ) : (
                <span className="min-w-0 truncate text-sm text-gray-500">
                  {isSingleSelect ? 'Select a row to continue' : `${selectedCount} selected`}
                </span>
              )}
            </div>

            <SelectionConfirmActions
              layout="inline"
              selectedCount={selectedCount}
              showCount={!isSingleSelect}
              disabled={disabled}
              confirmDisabled={selectedCount === 0}
              onConfirm={handleConfirm}
              onCancel={onCancel}
            />
          </div>
        )}
      </div>
    </div>
  );
}
