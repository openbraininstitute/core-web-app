'use client';

/**
 * `model_selector_single` — pick exactly one entity from the scan-config editor.
 *
 * separate field and separate value shape from `model_identifier_multiple` (a
 * scalar FromID ref, not a list), but the same surfaces: the middle-column card
 * previews into the right column, and picking opens the shared browse overlay
 * in single-select mode
 */

import { useCallback, useMemo, useState } from 'react';

import { WorkspaceSection } from '@/constants';
import { useScanConfigWorkflowEditorField } from '@/features/scan-config/bridge/editor-context';
import {
  ScanConfigEntityPreviewOrigin,
  useScanConfigEntityPreview,
  useSetScanConfigEntityPreview,
} from '@/features/scan-config/bridge/entity-preview';
import { useScanConfigMainOverlayOptional } from '@/features/scan-config/bridge/main-overlay-context';
import {
  ModelIdentifierBrowseWidget,
  ModelIdentifierBrowseWidgetSelectionMode,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple/browse-widget';
import { ModelIdentifierEntityCard } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/entity-card';
import {
  collectWorkflowSessionRefs,
  resolveEntityFetchTarget,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple/helpers';
import { ModelIdentifierAddActionButton } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/summary-view';
import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import {
  getEntityTypeTagLabel,
  isFromIdRef,
  type TFromIdRef,
} from '@/features/scan-config/helpers';
import { type ConfigValue, ScanConfigUIElementDict } from '@/features/scan-config/types';
import { useLatest } from '@/ui/hooks/use-latest';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Modal } from '@/ui/molecules/modal';
import { Skeleton } from '@/ui/molecules/skeleton';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

interface SelectorModalProps {
  disabled?: boolean;
  entityType: TEntityTypeDict;
  onChange: (newState: Record<string, ConfigValue>) => void;
  filters?: Record<string, unknown>;
  value?: ConfigValue;
  valueType?: string;
  state: Record<string, ConfigValue>;
  fieldKey: string;
  /** json schema fragment for the field; supplies accepted types when declared */
  paramSchema?: Record<string, unknown>;
}

export function EntitySelectorSingle({
  onChange,
  entityType,
  disabled,
  filters = {},
  value,
  state,
  fieldKey,
  valueType,
  paramSchema,
}: SelectorModalProps) {
  const { virtualLabId, projectId } = useWorkspace();
  const workflowField = useScanConfigWorkflowEditorField();
  const overlayHost = useScanConfigMainOverlayOptional();
  const entityPreview = useScanConfigEntityPreview();
  const setEntityPreview = useSetScanConfigEntityPreview();

  // fallback surface when the field renders outside the scan-config template
  // (no overlay host): the same widget, wrapped in a modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // `openOverlay` snapshots the browse widget at open time; the confirm/remove
  // handlers must merge against the current block state, not the captured one
  const latestWrite = useLatest({ state, onChange });

  const browseEntityType = entityType as unknown as TExtendedEntitiesTypeDict;
  const selectedRef = isFromIdRef(value) ? value : null;

  const refs = useMemo(() => (selectedRef ? [selectedRef] : []), [selectedRef]);
  const sessionRefs = useMemo(
    () => collectWorkflowSessionRefs(workflowField?.workflowSessionSelection),
    [workflowField?.workflowSessionSelection]
  );

  const { entities, pendingIds } = useResolvedModelIdentifierEntities({
    refs,
    sessionRefs,
    context: { virtualLabId, projectId },
  });

  const resolvedEntity = selectedRef
    ? entities.find((entity) => entity.id === selectedRef.id_str)
    : undefined;
  const isPending = Boolean(selectedRef && !resolvedEntity && pendingIds.has(selectedRef.id_str));

  const typeTitle = getEntityTypeTagLabel(browseEntityType);
  const entityLabel = typeTitle.toLowerCase();

  // the field accepts exactly one type, so the overlay's type switcher stays hidden
  const configurationInputs = useMemo(
    () => [{ type: browseEntityType, label: typeTitle, filters }],
    [browseEntityType, filters, typeTitle]
  );

  const closeSurface = useCallback(() => {
    setIsModalOpen(false);
    overlayHost?.closeOverlay();
  }, [overlayHost]);

  // id-only preview; the right column resolves the record itself. Flagged as a selection so a
  // workflow that owns its right column keeps its own preview — see `resolveRightPreviewMode`.
  const previewRef = useCallback(
    (ref: TFromIdRef | undefined) => {
      if (!ref) {
        return;
      }
      const target = resolveEntityFetchTarget(ref);
      if (target) {
        setEntityPreview({
          dataType: target.entityType,
          id: target.id,
          origin: ScanConfigEntityPreviewOrigin.Selection,
        });
      }
    },
    [setEntityPreview]
  );

  const handleConfirm = useCallback(
    (confirmedRefs: TFromIdRef[]) => {
      const picked = confirmedRefs.at(0);
      if (picked) {
        // the schema's `type` const stays authoritative for the stored value;
        // the browse-resolved FromID type is the fallback
        const nextRef: TFromIdRef = { id_str: picked.id_str, type: valueType ?? picked.type };
        // read `state`/`onChange` through a ref: `openOverlay` snapshots this
        // widget at open time, so merging against a captured `state` would
        // clobber any sibling-field edit that landed while the picker was open
        const { state: latestState, onChange: latestOnChange } = latestWrite.current;
        latestOnChange({ ...latestState, [fieldKey]: nextRef });
        previewRef(nextRef);
      }
      closeSurface();
    },
    [closeSurface, fieldKey, latestWrite, previewRef, valueType]
  );

  // closed without confirming: keep previewing whatever is still selected
  const handleCancel = useCallback(() => {
    previewRef(selectedRef ?? undefined);
    closeSurface();
  }, [closeSurface, previewRef, selectedRef]);

  const browseWidget = (
    <ModelIdentifierBrowseWidget
      title={typeTitle}
      fieldSchema={paramSchema ?? {}}
      initialRefs={refs}
      selectionMode={ModelIdentifierBrowseWidgetSelectionMode.Single}
      configurationInputs={configurationInputs}
      configureBinding={workflowField?.configureBinding}
      workspaceSection={workflowField?.workspaceSection ?? WorkspaceSection.GeneralWorkflow}
      workspace={{ virtualLabId, projectId }}
      sessionRefs={sessionRefs}
      requireSpecies={workflowField?.requireSpecies}
      browseConfig={workflowField?.browseConfig}
      prerequisites={workflowField?.workflowSessionSelection?.prerequisites}
      disabled={disabled}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  const openBrowse = useCallback(() => {
    if (overlayHost) {
      overlayHost.openOverlay(browseWidget);
      return;
    }
    setIsModalOpen(true);
  }, [browseWidget, overlayHost]);

  const handleRemove = useCallback(() => {
    setEntityPreview((current) => (current?.id === selectedRef?.id_str ? null : current));
    const { state: latestState, onChange: latestOnChange } = latestWrite.current;
    latestOnChange({ ...latestState, [fieldKey]: null });
  }, [fieldKey, latestWrite, selectedRef?.id_str, setEntityPreview]);

  return (
    <div
      className="flex w-full max-w-full min-w-0 flex-col gap-2 overflow-hidden"
      data-scan-config-block-element={ScanConfigUIElementDict.ModelSelectorSingle}
    >
      {isPending ? <Skeleton className="h-11 w-full rounded-full bg-gray-100" /> : null}

      {!isPending && selectedRef ? (
        resolvedEntity ? (
          <ModelIdentifierEntityCard
            instanceId={selectedRef.id_str}
            blockElement={`${ScanConfigUIElementDict.ModelSelectorSingle}-summary`}
            collapsibleBadge
            entityName={resolvedEntity.name}
            typeLabel={typeTitle}
            disabled={disabled}
            selected={
              entityPreview?.id === resolvedEntity.id &&
              entityPreview.dataType === resolvedEntity.entityType
            }
            onSelect={() =>
              setEntityPreview({
                dataType: resolvedEntity.entityType,
                id: resolvedEntity.id,
                record: {
                  ...resolvedEntity,
                  type: resolvedEntity.type ?? resolvedEntity.entityType,
                },
              })
            }
            onChange={openBrowse}
            onRemove={handleRemove}
          />
        ) : (
          <div className="rounded-full border border-dashed border-neutral-2 px-4 py-2.5 text-sm text-gray-500">
            {selectedRef.id_str}
          </div>
        )
      ) : null}

      {!selectedRef && !isPending && !disabled ? (
        <ModelIdentifierAddActionButton
          label={`Select ${entityLabel}`}
          disabled={disabled}
          onClick={openBrowse}
        />
      ) : null}

      {/* read-only field with no value: keep an explicit empty state (the old
          disabled placeholder) instead of rendering nothing */}
      {disabled && !selectedRef && !isPending ? (
        <span className="px-1 text-sm text-gray-400 italic">No {entityLabel} selected</span>
      ) : null}

      {overlayHost ? null : (
        <Modal
          destroyOnClose
          open={isModalOpen}
          onClose={handleCancel}
          title={
            <div className="text-primary-9 text-2xl font-light">
              Select <span className="font-bold">{typeTitle}</span>
            </div>
          }
          headerClassName="[&>div]:text-2xl! select-none font-bold [&>div]:text-primary-8!"
          bodyClassName="h-full w-full max-h-[calc(100vh-140px)]"
          closeIconClassName="rounded-full size-8 flex items-center justify-center hover:text-primary-8!"
          className="h-screen w-screen rounded-none"
          size="full"
        >
          <div className="h-full w-full">{isModalOpen ? browseWidget : null}</div>
        </Modal>
      )}
    </div>
  );
}
