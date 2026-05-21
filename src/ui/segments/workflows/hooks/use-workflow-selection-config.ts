'use client';

import { useMemo } from 'react';

import { useObioneJsonSchema } from '@/features/scan-config/components/hooks/schema';
import { parseSchemaInitializeSelection } from '@/features/scan-config/schema/parse-initialize-selection';
import { getConfigurationInputs, getWorkflow } from '@/ui/segments/workflows/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkflowSelectionConfig } from '@/features/scan-config/schema/types';
import type { ConfigSchema, SchemaName } from '@/features/scan-config/types';
import type { TActivityValue } from '@/ui/segments/workflows/config';
import type {
  IWorkflowConfigurationInput,
  IWorkflowDescriptor,
} from '@/ui/segments/workflows/config/types';

/**
 * arguments for {@link useWorkflowSelectionConfig}
 *
 * @param activity - workflow activity (build, simulate, extract, process).
 * @param targetType - extended entity type for the workflow target (from route or picker).
 */
export type TUseWorkflowSelectionConfigParams = {
  activity: TActivityValue | null | undefined;
  targetType: TExtendedEntitiesTypeDict | null | undefined;
};

/**
 * values returned by {@link useWorkflowSelectionConfig}
 *
 * @param workflow - workflow descriptor, or `null` when `activity` / `targetType` are missing.
 * @param schemaName - obiOne scan-config schema name when the workflow is scan-config driven.
 * @param schema - loaded JSON schema document; `undefined` while fetching or when not applicable.
 * @param configurationInputs - workflow registry inputs for browse UI (entity-type tabs, filters, backend coordination).
 * @param selectionConfig - browse selection rules from the scan-config schema `initialize` block.
 * @param isLoading - `true` while the scan-config schema required for selection is still loading
 * @returns {@link TUseWorkflowSelectionConfigResult}
 */
export type TUseWorkflowSelectionConfigResult = {
  workflow: IWorkflowDescriptor | null;
  schemaName: SchemaName | undefined;
  schema: ConfigSchema | undefined;
  configurationInputs: readonly IWorkflowConfigurationInput[];
  selectionConfig: TWorkflowSelectionConfig | null;
  isLoading: boolean;
};

/**
 * resolves workflow browse configuration for `/workflows/{activity}/new/{type}`.
 *
 * - **scan-config workflows:** {@link selectionConfig} comes only from the fetched ObiOne
 *   schema via {@link parseSchemaInitializeSelection}.
 * - **non-scan-config workflows:** `selectionConfig` is `null`.
 * - **configurationInputs:** exposed separately from the workflow registry for browse UI
 *   (entity-type selector, filters); not used to derive selection rules.
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

  const schemaName = workflow?.scanConfig?.schemaName;

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
    if (!workflow?.isScanConfig || !schemaName) return null;
    if (!schema) return null;

    return parseSchemaInitializeSelection({ schema, schemaName });
  }, [schema, schemaName, workflow]);

  return {
    workflow,
    schemaName,
    schema,
    configurationInputs,
    selectionConfig,
    isLoading: Boolean(workflow?.isScanConfig && schemaName) && isLoading,
  };
}
