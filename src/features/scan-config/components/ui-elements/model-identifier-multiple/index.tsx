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

import type {
  TFromIdRef,
  TModelIdentifierParsedValue,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple/types';

type Props = {
  fieldKey: string;
  value: ConfigValue;
  state: Record<string, ConfigValue>;
  setState: (nextState: Record<string, ConfigValue>) => void;
  paramSchema: TModelIdentifierMultiple;
  disabled?: boolean;
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

  const resolvedEntities = useMemo(
    () =>
      allRefs.flatMap((ref) => {
        const entityMatch = entities.find((entry) => entry.id === ref.id_str);
        if (!entityMatch) {
          return [];
        }

        return [{ ...entityMatch, ref }];
      }),
    [allRefs, entities]
  );

  const writeValue = useCallback(
    (nextValue: ConfigValue) => {
      setState({ ...state, [fieldKey]: nextValue });
    },
    [fieldKey, setState, state]
  );

  const handleRemoveEntity = useCallback(
    (ref: TFromIdRef, groupIndex?: number) => {
      setEntityPreview((current) => (current?.record.id === ref.id_str ? null : current));
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
      closeOverlay();
    },
    [closeOverlay, parsedValue, writeValue]
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
          disabled={disabled}
          onConfirm={(refs, groupName) => handleBrowseConfirm(refs, groupName, groupIndex)}
          onCancel={closeOverlay}
        />
      );
    },
    [
      closeOverlay,
      disabled,
      workflowField,
      fieldSchema,
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
