'use client';

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

import { WorkflowBreadcrumbPhaseDict } from '@/ui/segments/workflows/config/types';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkflowBreadcrumbPhase } from '@/ui/segments/workflows/config';

/**
 * Browse state the `/new/{type}` breadcrumb needs to render, published by the browse page
 * (`listing.tsx`) and read by the breadcrumb (rendered in the route layout).
 *
 * The provider lives inside the `/new/{type}` route subtree, so its lifetime is the route:
 * leaving `/new` unmounts it (state gone), and a `key={type}` on the provider resets it when
 * switching workflows. No global store, no manual reset — unlike a module-level atom.
 */
type TWorkflowBreadcrumbState = {
  phase: TWorkflowBreadcrumbPhase;
  activeEntityType: TExtendedEntitiesTypeDict | null;
};

type TWorkflowBreadcrumbContextValue = TWorkflowBreadcrumbState & {
  setBreadcrumbState: (state: TWorkflowBreadcrumbState) => void;
};

const WorkflowBreadcrumbContext = createContext<TWorkflowBreadcrumbContextValue | null>(null);

export function WorkflowBreadcrumbProvider({ children }: { children: ReactNode }) {
  const [state, setBreadcrumbState] = useState<TWorkflowBreadcrumbState>({
    phase: WorkflowBreadcrumbPhaseDict.Selection,
    activeEntityType: null,
  });

  const value = useMemo<TWorkflowBreadcrumbContextValue>(
    () => ({ ...state, setBreadcrumbState }),
    [state]
  );

  return (
    <WorkflowBreadcrumbContext.Provider value={value}>
      {children}
    </WorkflowBreadcrumbContext.Provider>
  );
}

export function useWorkflowBreadcrumbState(): TWorkflowBreadcrumbContextValue {
  const context = useContext(WorkflowBreadcrumbContext);
  if (!context) {
    throw new Error('useWorkflowBreadcrumbState must be used within a WorkflowBreadcrumbProvider');
  }
  return context;
}
