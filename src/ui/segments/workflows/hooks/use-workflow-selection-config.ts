'use client';

import { useMemo } from 'react';

import { useObioneJsonSchema } from '@/features/scan-config/components/hooks/schema';
import { parseSchemaInitializeSelection } from '@/features/scan-config/schema/parse-initialize-selection';
import { WorkflowInitializeSelectionMode } from '@/features/scan-config/schema/types';
import {
  getConfigurationInputs,
  getWorkflow,
  getWorkflowScanConfigSchemaName,
  resolveWorkflowBrowseSelectionConfig,
} from '@/ui/segments/workflows/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkflowSelectionConfig } from '@/features/scan-config/schema/types';
import type { ConfigSchema, SchemaName } from '@/features/scan-config/types';
import type { TActivityValue } from '@/ui/segments/workflows/config';
import type {
  IWorkflowConfigurationInput,
  IWorkflowDescriptor,
} from '@/ui/segments/workflows/config/types';

/** arguments for {@link useWorkflowSelectionConfig} */
export type TUseWorkflowSelectionConfigParams = {
  /** workflow activity (build, simulate, extract, process). */
  activity: TActivityValue | null | undefined;
  /** extended entity type for the workflow target (from route or picker). */
  targetType: TExtendedEntitiesTypeDict | null | undefined;
};

/** values returned by {@link useWorkflowSelectionConfig} */
export type TUseWorkflowSelectionConfigResult = {
  /** resolved workflow descriptor, or `null` when `activity` / `targetType` are missing. */
  workflow: IWorkflowDescriptor | null;
  /** obiOne scan-config schema name when the workflow is scan-config driven. */
  schemaName: SchemaName | undefined;
  /** loaded JSON schema document; `undefined` while fetching or when not applicable. */
  schema: ConfigSchema | undefined;
  /** entity types the user can pick on the browse page (one table per input). */
  configurationInputs: readonly IWorkflowConfigurationInput[];
  /**
   * resolved browse selection rules (mode, table control type, accepted types).
   * `null` while schema is loading, when selection is disabled, or for non-scan workflows.
   */
  selectionConfig: TWorkflowSelectionConfig | null;
  /** `true` while the scan-config schema required for selection is still loading*/
  isLoading: boolean;
};

/**
 * resolves workflow browse configuration for the `/workflows/{activity}/new/{type}`
 *
 * combines three sources into a single selection config consumed by browse UI:
 *
 * 1. **workflow descriptor** — activity + target type from the workflow registry.
 * 2. **configuration inputs** — entity types/tables shown in the entity-type dropdown.
 * 3. **scan-config schema** — `initialize` block parsed via {@link parseSchemaInitializeSelection}
 *    when {@link IWorkflowDescriptor.isScanConfig} is true
 *
 * resolution order for `selectionConfig`:
 * - Non-scan workflows → `null` (no schema-driven selection).
 * - Scan workflow with pending schema fetch → `null` (callers should wait on `isLoading`).
 * - Workflow with `configurationInputs` → {@link resolveWorkflowBrowseSelectionConfig}
 *   merges schema selection with input metadata.
 * - Otherwise → schema-only selection when mode is not `none`.
 *
 * @param params - Workflow activity and target entity type from the current route.
 * @returns Workflow metadata, configuration inputs, and resolved selection rules for browse UI.
 *
 * @example
 * ```tsx
 * const { workflow, configurationInputs, selectionConfig, isLoading } =
 *   useWorkflowSelectionConfig({ activity, targetType });
 *
 * if (isLoading) return null;
 *
 * const tableSelectionType = selectionConfig?.tableSelectionType;
 * ```
 */
export function useWorkflowSelectionConfig({
  activity,
  targetType,
}: TUseWorkflowSelectionConfigParams): TUseWorkflowSelectionConfigResult {
  const workflow = useMemo(() => {
    if (!activity || !targetType) {
      return null;
    }

    return getWorkflow({ activity, targetType });
  }, [activity, targetType]);

  const schemaName = workflow
    ? getWorkflowScanConfigSchemaName({ activity, targetType: workflow.targetType })
    : undefined;

  const { schema, isLoading } = useObioneJsonSchema({
    schemaName: workflow?.isScanConfig ? schemaName : undefined,
  });

  const configurationInputs = useMemo(() => {
    if (!activity || !targetType) {
      return [];
    }

    return getConfigurationInputs({ activity, targetType });
  }, [activity, targetType]);

  const selectionConfig = useMemo((): TWorkflowSelectionConfig | null => {
    if (!workflow || !activity || !targetType || !workflow.isScanConfig) {
      return null;
    }

    if (schemaName && !schema) {
      return null;
    }

    const schemaSelection =
      schema && schemaName ? parseSchemaInitializeSelection({ schema, schemaName }) : null;

    if (
      schemaSelection?.selectionMode === WorkflowInitializeSelectionMode.None &&
      configurationInputs.length === 0
    ) {
      return null;
    }

    if (configurationInputs.length > 0) {
      return resolveWorkflowBrowseSelectionConfig({
        activity,
        targetType,
        schemaSelection,
      });
    }

    if (schemaSelection && schemaSelection.selectionMode !== WorkflowInitializeSelectionMode.None) {
      return schemaSelection;
    }

    return schemaSelection;
  }, [activity, configurationInputs, schema, schemaName, targetType, workflow]);

  return {
    workflow,
    schemaName,
    schema,
    configurationInputs,
    selectionConfig,
    isLoading: Boolean(workflow?.isScanConfig && schemaName) && isLoading,
  };
}
