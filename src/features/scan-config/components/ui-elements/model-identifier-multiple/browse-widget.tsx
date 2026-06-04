'use client';

import { CloseOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import { INTERNAL_QUERY_CACHE_PREFIX } from '@/constants';
import {
  countSelectedEntities,
  mergeConfigurationInputs,
  selectionsByTypeToFromIdRefs,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple/helpers';
import { ModelIdentifierSelectionCart } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/selection-cart';
import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
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

type TProps = {
  title: string;
  fieldSchema: Record<string, unknown>;
  initialRefs: readonly TFromIdRef[];
  initialGroupName?: string;
  showGroupName?: boolean;
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

export function ModelIdentifierBrowseWidget({
  title,
  fieldSchema,
  initialRefs,
  initialGroupName = 'Default name',
  showGroupName = false,
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

      setSelectionsByType((previous) => ({
        ...previous,
        [activeEntityType]: rows,
      }));
    },
    [activeEntityType]
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

  return (
    <div
      className={cn(
        'grid h-full min-h-0 gap-3 overflow-hidden bg-gray-50 rounded-2xl border border-gray-50',
        {
          'grid-cols-1': mdv,
          'grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]': !mdv,
        }
      )}
    >
      {!mdv ? (
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
              selectionType: 'checkbox',
              selectedRows: activeSelectedRows,
              onRowsSelected: handleRowsSelected,
              keepSelectionOnScopeChange: true,
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
      </div>
    </div>
  );
}
