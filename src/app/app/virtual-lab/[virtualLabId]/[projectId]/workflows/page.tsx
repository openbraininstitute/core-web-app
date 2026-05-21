'use client';

import { useRouter } from '@bprogress/next';
import { AnimatePresence, motion } from 'motion/react';
import { parseAsString, type SingleParserBuilder, useQueryStates } from 'nuqs';
import { use, useCallback, useState } from 'react';

import { WorkspaceScope } from '@/constants';
import { createWorkflowSessionId } from '@/features/scan-config/workflow/selection';
import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { SCOPE_QUERY_PARAMS } from '@/ui/hooks/use-scope';
import { useNextStepOnboarding, workflowTour } from '@/ui/segments/app-setup/discover-app';
import {
  buildWorkflowHubStageHref,
  resolveWorkflowInitialStage,
  WORKFLOW_SESSION_ID_SEARCH_PARAM,
} from '@/ui/segments/workflows/config';
import { WorkflowMainSelector } from '@/ui/segments/workflows/elements/main-selector';
import { WorkflowActivity } from '@/ui/segments/workflows/elements/workflow-activity';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TActivityValue } from '@/ui/segments/workflows/config';

export default function Page({ params }: ServerSideComponentProp<WorkspaceContext, null>) {
  useDisableElementOverflow({ id: 'workspace-body' });
  useNextStepOnboarding({ condition: true, tour: workflowTour });

  const { virtualLabId, projectId } = use(params);
  const { push: navigate } = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const [{ activity, entityType }, updateWorkflowState] = useQueryStates(
    {
      activity: parseAsString.withOptions({
        clearOnDefault: false,
        shallow: true,
      }) as SingleParserBuilder<TActivityValue>,
      entityType: parseAsString.withOptions({
        clearOnDefault: false,
        shallow: true,
      }) as SingleParserBuilder<TExtendedEntitiesTypeDict>,
    },
    {
      urlKeys: {
        activity: 'activity',
        entityType: 'type',
      },
    }
  );

  const onSelectCategory = (value: TActivityValue | null) => {
    updateWorkflowState(() => ({ activity: value, entityType: null }));
  };

  const onSelectType = useCallback(
    async (value: TExtendedEntitiesTypeDict | null) => {
      if (!activity || !value || isNavigating) {
        return;
      }

      setIsNavigating(true);
      const query = new URLSearchParams();
      query.set(SCOPE_QUERY_PARAMS, WorkspaceScope.Public);

      try {
        const { stage, attachSessionId, workflow } = await resolveWorkflowInitialStage({
          activity,
          targetType: value,
        });

        const sessionId = attachSessionId ? createWorkflowSessionId() : undefined;

        if (sessionId) {
          query.set(WORKFLOW_SESSION_ID_SEARCH_PARAM, sessionId);
        }

        navigate(
          buildWorkflowHubStageHref({
            activity,
            targetType: value,
            workspace: { virtualLabId, projectId },
            stage,
            workflow,
            sessionId,
            query: Object.fromEntries(query.entries()),
          })
        );
      } finally {
        setIsNavigating(false);
      }
    },
    [activity, isNavigating, navigate, projectId, virtualLabId]
  );

  return (
    <div className="mr-0 ml-3 flex h-full max-h-[calc(100vh-6rem)] flex-col gap-2.5">
      <WorkflowMainSelector
        activity={activity}
        entityType={entityType}
        onSelectCategory={onSelectCategory}
        onSelectType={onSelectType}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key="workflow-activity-content"
          id="workflow-activity-content"
          data-testid="workflow-activity-content"
          className="border-neutral-2 mr-1 h-full rounded-2xl border px-5"
          style={{ willChange: 'opacity' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.2,
            ease: 'easeInOut',
          }}
        >
          <WorkflowActivity />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
