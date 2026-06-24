'use client';

import { useCallback, useMemo } from 'react';

import { WorkspaceSection } from '@/constants';
import { useScanConfigWorkflowEditorField } from '@/features/scan-config/bridge/editor-context';
import { useSetScanConfigEntityPreview } from '@/features/scan-config/bridge/entity-preview';
import { useScanConfigMainOverlay } from '@/features/scan-config/bridge/main-overlay-context';
import { ModelIdentifierBrowseWidget } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/browse-widget';
import {
  collectWorkflowSessionRefs,
  getAllRefsFromParsed,
  parseModelIdentifierFieldValue,
  resolveEntityFetchTarget,
  serializeModelIdentifierFieldValue,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple/helpers';
import { ModelIdentifierSummaryView } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/summary-view';
import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import {
  type ConfigValue,
  ScanConfigUIElementDict,
  type TModelIdentifierMultiple,
} from '@/features/scan-config/types';
import { ModelIdentifierFieldStorageMode } from '@/features/scan-config/workflow/workflow-schema-selection';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { TModelIdentifierParsedValue } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/types';
import type { TFromIdRef } from '@/features/scan-config/helpers';

type Props = {
  fieldKey: string;
  value: ConfigValue;
  state: Record<string, ConfigValue>;
  setState: (nextState: Record<string, ConfigValue>) => void;
  paramSchema: TModelIdentifierMultiple;
  disabled?: boolean;
  /** root-element-scoped path (e.g. `initialize/neurons`) for left-menu field-error matching */
  errorPathPrefix?: string;
};

function updateParsedValue(
  parsed: TModelIdentifierParsedValue,
  updater: (current: TModelIdentifierParsedValue) => TModelIdentifierParsedValue
): ConfigValue {
  return serializeModelIdentifierFieldValue(updater(parsed));
}

export function ModelIdentifierMultiple({
  fieldKey,
  value,
  state,
  setState,
  paramSchema,
  disabled = false,
  errorPathPrefix,
}: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const workflowField = useScanConfigWorkflowEditorField();
  const { openOverlay, closeOverlay } = useScanConfigMainOverlay();
  const setEntityPreview = useSetScanConfigEntityPreview();

  const fieldSchema = paramSchema as unknown as Record<string, unknown>;
  const parsedValue = useMemo(
    () => parseModelIdentifierFieldValue(value, fieldSchema),
    [fieldSchema, value]
  );

  const sessionRefs = useMemo(
    () => collectWorkflowSessionRefs(workflowField?.workflowSessionSelection),
    [workflowField?.workflowSessionSelection]
  );
  const allRefs = useMemo(() => getAllRefsFromParsed(parsedValue), [parsedValue]);

  const { entities, pendingIds } = useResolvedModelIdentifierEntities({
    refs: allRefs,
    sessionRefs,
    context: { virtualLabId, projectId },
  });

  const resolvedEntities = useMemo(() => {
    const entitiesById = new Map(entities.map((entry) => [entry.id, entry]));

    return allRefs.flatMap((ref) => {
      const entityMatch = entitiesById.get(ref.id_str);
      if (!entityMatch) {
        return [];
      }

      return [{ ...entityMatch, ref }];
    });
  }, [allRefs, entities]);

  const writeValue = useCallback(
    (nextValue: ConfigValue) => {
      setState({ ...state, [fieldKey]: nextValue });
    },
    [fieldKey, setState, state]
  );

  const handleRemoveEntity = useCallback(
    (ref: TFromIdRef, groupIndex?: number) => {
      setEntityPreview((current) => (current?.id === ref.id_str ? null : current));
      writeValue(
        updateParsedValue(parsedValue, (current) => {
          if (current.storageMode === ModelIdentifierFieldStorageMode.Grouped) {
            return {
              storageMode: current.storageMode,
              groups: current.groups.map((group, index) =>
                index === groupIndex
                  ? {
                      ...group,
                      elements: group.elements.filter((item) => item.id_str !== ref.id_str),
                    }
                  : group
              ),
            };
          }

          return {
            storageMode: current.storageMode,
            items: current.items.filter((item) => item.id_str !== ref.id_str),
          };
        })
      );
    },
    [parsedValue, setEntityPreview, writeValue]
  );

  const handleGroupNameChange = useCallback(
    (groupIndex: number, name: string) => {
      if (parsedValue.storageMode !== ModelIdentifierFieldStorageMode.Grouped) {
        return;
      }

      writeValue(
        updateParsedValue(parsedValue, (current) => {
          if (current.storageMode !== ModelIdentifierFieldStorageMode.Grouped) {
            return current;
          }

          return {
            storageMode: current.storageMode,
            groups: current.groups.map((group, index) =>
              index === groupIndex ? { ...group, name } : group
            ),
          };
        })
      );
    },
    [parsedValue, writeValue]
  );

  const handleAddGroup = useCallback(() => {
    if (parsedValue.storageMode !== ModelIdentifierFieldStorageMode.Grouped) {
      return;
    }

    writeValue(
      updateParsedValue(parsedValue, (current) => {
        if (current.storageMode !== ModelIdentifierFieldStorageMode.Grouped) {
          return current;
        }

        return {
          storageMode: current.storageMode,
          groups: [
            ...current.groups,
            { name: `Neuron Set ${current.groups.length}`, elements: [] },
          ],
        };
      })
    );
  }, [parsedValue, writeValue]);

  const handleRemoveGroup = useCallback(
    (groupIndex: number) => {
      if (parsedValue.storageMode !== ModelIdentifierFieldStorageMode.Grouped) {
        return;
      }

      if (parsedValue.groups.length <= 1) {
        return;
      }

      writeValue(
        updateParsedValue(parsedValue, (current) => {
          if (current.storageMode !== ModelIdentifierFieldStorageMode.Grouped) {
            return current;
          }

          return {
            storageMode: current.storageMode,
            groups: current.groups.filter((_, index) => index !== groupIndex),
          };
        })
      );
    },
    [parsedValue, writeValue]
  );

  // select an entity in the central column from its ref (id-only preview; the
  // right column resolves the record itself)
  const selectPreviewFromRef = useCallback(
    (ref: TFromIdRef | undefined) => {
      if (!ref) {
        return;
      }
      const target = resolveEntityFetchTarget(ref);
      if (target) {
        setEntityPreview({ dataType: target.entityType, id: target.id });
      }
    },
    [setEntityPreview]
  );

  // refs for the group currently being edited (pre-update state)
  const getGroupRefs = useCallback(
    (groupIndex?: number): readonly TFromIdRef[] =>
      parsedValue.storageMode === ModelIdentifierFieldStorageMode.Grouped
        ? (parsedValue.groups[groupIndex ?? 0]?.elements ?? [])
        : parsedValue.items,
    [parsedValue]
  );

  const handleBrowseConfirm = useCallback(
    (refs: TFromIdRef[], groupName?: string, groupIndex?: number) => {
      writeValue(
        updateParsedValue(parsedValue, (current) => {
          if (current.storageMode === ModelIdentifierFieldStorageMode.Grouped) {
            return {
              storageMode: current.storageMode,
              groups: current.groups.map((group, index) =>
                index === groupIndex
                  ? {
                      name: groupName ?? group.name,
                      elements: refs,
                    }
                  : group
              ),
            };
          }

          return {
            storageMode: current.storageMode,
            items: refs,
          };
        })
      );
      // preview the first newly-added entity (fallback: the first in the result) (Asked by @James)
      const previousIds = new Set(getGroupRefs(groupIndex).map((ref) => ref.id_str));
      selectPreviewFromRef(refs.find((ref) => !previousIds.has(ref.id_str)) ?? refs[0]);
      closeOverlay();
    },
    [closeOverlay, getGroupRefs, parsedValue, selectPreviewFromRef, writeValue]
  );

  // closed without confirming (Cancel or X): preview the top entity of the group (Asked by @James)
  const handleBrowseCancel = useCallback(
    (groupIndex?: number) => {
      selectPreviewFromRef(getGroupRefs(groupIndex)[0]);
      closeOverlay();
    },
    [closeOverlay, getGroupRefs, selectPreviewFromRef]
  );

  const handleAddEntities = useCallback(
    (groupIndex?: number) => {
      const isGrouped = parsedValue.storageMode === ModelIdentifierFieldStorageMode.Grouped;
      const initialRefs = isGrouped
        ? (parsedValue.groups[groupIndex ?? 0]?.elements ?? [])
        : parsedValue.items;
      const initialGroupName = isGrouped ? parsedValue.groups[groupIndex ?? 0]?.name : undefined;

      openOverlay(
        <ModelIdentifierBrowseWidget
          title={paramSchema.title}
          fieldSchema={fieldSchema}
          initialRefs={initialRefs}
          initialGroupName={initialGroupName}
          showGroupName={isGrouped}
          configurationInputs={workflowField?.configurationInputs}
          configureBinding={workflowField?.configureBinding}
          workspaceSection={workflowField?.workspaceSection ?? WorkspaceSection.GeneralWorkflow}
          workspace={{ virtualLabId, projectId }}
          sessionRefs={sessionRefs}
          requireSpecies={workflowField?.requireSpecies}
          browseConfig={workflowField?.browseConfig}
          prerequisites={workflowField?.workflowSessionSelection?.prerequisites}
          disabled={disabled}
          onConfirm={(refs, groupName) => handleBrowseConfirm(refs, groupName, groupIndex)}
          onCancel={() => handleBrowseCancel(groupIndex)}
        />
      );
    },
    [
      disabled,
      workflowField,
      fieldSchema,
      handleBrowseCancel,
      handleBrowseConfirm,
      openOverlay,
      paramSchema.title,
      parsedValue,
      projectId,
      sessionRefs,
      virtualLabId,
    ]
  );

  return (
    <div
      className="w-full max-w-full min-w-0 overflow-hidden"
      data-scan-config-block-element={ScanConfigUIElementDict.ModelIdentifierMultiple}
    >
      <ModelIdentifierSummaryView
        parsedValue={parsedValue}
        fieldSchema={fieldSchema}
        errorPathPrefix={errorPathPrefix}
        configurationInputs={workflowField?.configurationInputs}
        resolvedEntities={resolvedEntities}
        pendingIds={pendingIds}
        disabled={disabled}
        onAddEntities={handleAddEntities}
        onRemoveEntity={handleRemoveEntity}
        onAddGroup={
          parsedValue.storageMode === ModelIdentifierFieldStorageMode.Grouped
            ? handleAddGroup
            : undefined
        }
        onGroupNameChange={handleGroupNameChange}
        onRemoveGroup={handleRemoveGroup}
      />
    </div>
  );
}
