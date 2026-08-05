'use client';

import { usePathname } from 'next/navigation';
import { ViewTransition } from 'react';

import {
  getWorkflowFlowLevel,
  WORKFLOW_NAV_DOWN,
  WORKFLOW_NAV_UP,
} from '@/utils/workflow-view-transition';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

/**
 * Vertical slide between the steps of the workflow drill-down flow (start →
 * entity selection → scan config). The <ViewTransition> is keyed by the flow
 * level so that moving between steps remounts it; the direction types are
 * dispatched by the navigation calls in the flow. Navigations within a step
 * keep the same key and animate nothing. The type names don't overlap with the
 * workspace tab slide, so switching main tabs leaves this boundary inert and
 * vice versa.
 *
 * Browser back/forward stays unanimated: Next dispatches popstate
 * (ACTION_RESTORE) outside startTransition on purpose, so React never opens a
 * view transition for it and no transition type can reach this boundary.
 */
export function WorkflowFlowTransition({ children }: Props) {
  const pathname = usePathname();
  const level = getWorkflowFlowLevel(pathname);

  return (
    <ViewTransition
      key={level === null ? 'outside-flow' : `level-${level}`}
      default="none"
      update="none"
      enter={{
        [WORKFLOW_NAV_DOWN]: 'workflow-slide-enter-down',
        [WORKFLOW_NAV_UP]: 'workflow-slide-enter-up',
        default: 'none',
      }}
      exit={{
        [WORKFLOW_NAV_DOWN]: 'workflow-slide-exit-down',
        [WORKFLOW_NAV_UP]: 'workflow-slide-exit-up',
        default: 'none',
      }}
    >
      <div className="h-full w-full">{children}</div>
    </ViewTransition>
  );
}
