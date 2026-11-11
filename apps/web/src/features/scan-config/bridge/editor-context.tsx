'use client';

/**
 * Shares workflow-specific info with scan-config form fields and related UI.
 *
 * The workflow editor sets this once at the top via
 * {@link ScanConfigWorkflowEditorFieldProvider}. Nested fields (and hosts like
 * the right-column preview) read it with {@link useScanConfigWorkflowEditorField}
 * instead of threading props through every layer.
 *
 * Outside a workflow page the hook returns `null` — consumers fall back to
 * schema defaults and remain usable.
 */

import { createContext, useContext } from 'react';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceSection } from '@/constants';
import type { TScanConfigActivity } from '@/features/scan-config/types';
import type { TWorkflowSessionSelectionPayload } from '@/features/scan-config/workflow/workflow-session-selection';
import type { TWorkflowBrowseConfig } from '@/ui/segments/workflows/browse/browse-config';
import type { TScanConfigConfigureBinding } from '@/ui/segments/workflows/config/scan-config-binding';
import type { IWorkflowConfigurationInput } from '@/ui/segments/workflows/config/types';

/**
 * Value supplied by the workflow scan-config editor to nested form fields.
 *
 * Carries activity, browse/configure bindings, and the current session
 * selection so fields can resolve FromID types and browse rules without
 * prop drilling.
 */
export type TScanConfigWorkflowEditorFieldContext = {
  activity: TScanConfigActivity;
  workspaceSection: TWorkspaceSection;
  /** Workflow session id (`wf_…`) from the route; scopes field errors per session. */
  workflowSessionId?: string;
  /** Workflow hub target — passed into source-entity `viewer` resolve context. */
  targetType?: TExtendedEntitiesTypeDict;
  configureBinding?: TScanConfigConfigureBinding;
  configurationInputs: readonly IWorkflowConfigurationInput[];
  /** Picked entities and browse prerequisites (see `.prerequisites`). */
  workflowSessionSelection?: TWorkflowSessionSelectionPayload | null;
  requireSpecies?: boolean;
  /** Per-type browse rules (prerequisite + custom loader) from the workflow descriptor. */
  browseConfig?: TWorkflowBrowseConfig;
};

const ScanConfigWorkflowEditorFieldContext =
  createContext<TScanConfigWorkflowEditorFieldContext | null>(null);

/**
 * Provides {@link TScanConfigWorkflowEditorFieldContext} to the scan-config
 * editor subtree (fields, overlays, preview hosts, …).
 *
 * @param props.value - Workflow editor configuration for descendant consumers
 * @param props.children - Editor UI that may call {@link useScanConfigWorkflowEditorField}
 */
export function ScanConfigWorkflowEditorFieldProvider({
  value,
  children,
}: {
  value: TScanConfigWorkflowEditorFieldContext;
  children: React.ReactNode;
}) {
  return (
    <ScanConfigWorkflowEditorFieldContext.Provider value={value}>
      {children}
    </ScanConfigWorkflowEditorFieldContext.Provider>
  );
}

/**
 * Reads the nearest {@link ScanConfigWorkflowEditorFieldProvider} value.
 *
 * Use in scan-config fields or sibling hosts that need workflow identity
 * (e.g. `configureBinding.generatedApiPath`) without prop drilling. Do not
 * treat a non-null result as “always inside scan-config” for reusable
 * viewers — pass explicit props from the host instead.
 *
 * @returns The workflow editor context, or `null` when rendered outside a provider
 *
 * @example
 * ```tsx
 * const workflow = useScanConfigWorkflowEditorField();
 * const binding = workflow?.configureBinding;
 * ```
 */
export function useScanConfigWorkflowEditorField(): TScanConfigWorkflowEditorFieldContext | null {
  return useContext(ScanConfigWorkflowEditorFieldContext);
}
