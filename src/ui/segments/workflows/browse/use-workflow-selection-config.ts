'use client';

import { useMemo } from 'react';

import { useObioneJsonSchema } from '@/features/scan-config/components/hooks/schema';
import {
  parseWorkflowSchemaSelection,
  type TWorkflowSchemaSelection,
} from '@/features/scan-config/workflow/workflow-schema-selection';
import { getConfigurationInputs, getWorkflow } from '@/ui/segments/workflows/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ConfigSchema, SchemaName } from '@/features/scan-config/types';
import type { TActivityValue } from '@/ui/segments/workflows/config';
import type {
  IWorkflowConfigurationInput,
  IWorkflowDescriptor,
} from '@/ui/segments/workflows/config/types';

export type TUseWorkflowSelectionConfigParams = {
  activity: TActivityValue | null | undefined;
  targetType: TExtendedEntitiesTypeDict | null | undefined;
};

export type TUseWorkflowSelectionConfigResult = {
  workflow: IWorkflowDescriptor | null;
  schemaName: SchemaName | undefined;
  schema: ConfigSchema | undefined;
  configurationInputs: readonly IWorkflowConfigurationInput[];
  selectionConfig: TWorkflowSchemaSelection | null;
  isLoading: boolean;
};

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

  const selectionConfig = useMemo((): TWorkflowSchemaSelection | null => {
    if (!workflow?.isScanConfig || !schemaName) return null;
    if (!schema) return null;

    return parseWorkflowSchemaSelection({ schema, schemaName });
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
