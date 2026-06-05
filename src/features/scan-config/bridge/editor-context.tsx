'use client';

/**
 * shares workflow-specific info with scan-config form fields
 *
 * the workflow editor sets this once at the top. Fields read it with
 * `useScanConfigWorkflowField()` instead of passing props through every layer
 *
 * returns `null` outside workflow pages — fields keep working with schema defaults
 */

import { createContext, useContext } from 'react';

import type { TWorkspaceSection } from '@/constants';
import type { TScanConfigActivity } from '@/features/scan-config/types';
import type { TWorkflowSessionSelectionPayload } from '@/features/scan-config/workflow/workflow-session-selection';
import type { TWorkflowBrowseConfig } from '@/ui/segments/workflows/browse/browse-config';
import type { TScanConfigConfigureBinding } from '@/ui/segments/workflows/config/scan-config-binding';
import type { IWorkflowConfigurationInput } from '@/ui/segments/workflows/config/types';

export type TScanConfigWorkflowEditorFieldContext = {
  activity: TScanConfigActivity;
  workspaceSection: TWorkspaceSection;
  /** workflow session id (`wf_…`) from the route; scopes field errors per session */
  workflowSessionId?: string;
  configureBinding?: TScanConfigConfigureBinding;
  configurationInputs: readonly IWorkflowConfigurationInput[];
  /** carries the picked entities AND the browse prerequisites (see `.prerequisites`) */
  workflowSessionSelection?: TWorkflowSessionSelectionPayload | null;
  requireSpecies?: boolean;
  /** per-type browse rules (prerequisite + custom loader) from the workflow descriptor */
  browseConfig?: TWorkflowBrowseConfig;
};

const ScanConfigWorkflowEditorFieldContext =
  createContext<TScanConfigWorkflowEditorFieldContext | null>(null);

// NOTE: this is a context to share the workflow editor
// configuration and options with any subscribed nested components
// can be field, overlay, ...
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

export function useScanConfigWorkflowEditorField(): TScanConfigWorkflowEditorFieldContext | null {
  return useContext(ScanConfigWorkflowEditorFieldContext);
}
