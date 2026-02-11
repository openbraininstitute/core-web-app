'use client';

import { useRouter } from '@bprogress/next';
import { kebabCase } from 'es-toolkit/compat';
import { AnimatePresence, motion } from 'motion/react';
import { parseAsString, type SingleParserBuilder, useQueryStates } from 'nuqs';
import { use } from 'react';

import { config } from '@/config';
import { WorkspaceScope } from '@/constants';
import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { SCOPE_QUERY_PARAMS } from '@/ui/hooks/use-scope';
import { useNextStepOnboarding, workflowTour } from '@/ui/segments/app-setup/discover-app';
import { CategoryMenu } from '@/ui/segments/workflows/elements/category-menu';
import {
  ActivityValues,
  WorkflowSessionIdSearchParam,
} from '@/ui/segments/workflows/elements/helpers';
import { TypesMenu } from '@/ui/segments/workflows/elements/types-menu';
import { WorkflowActivity } from '@/ui/segments/workflows/elements/workflow-activity';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';

export default function Page({ params }: ServerSideComponentProp<WorkspaceContext, null>) {
  useDisableElementOverflow({ id: 'workspace-body' });
  const { virtualLabId, projectId } = use(params);
  const { push: navigate } = useRouter();

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

  const onSelectType = (value: TExtendedEntitiesTypeDict | null) => {
    if (activity === ActivityValues.Build) {
      const sessionId = crypto.randomUUID();
      const query = new URLSearchParams();
      query.set(WorkflowSessionIdSearchParam, sessionId);
      query.set(PanelQueryParam, WorkflowSimulatePanels.Configuration);
      if (value)
        navigate(
          `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/${activity}/configure/${kebabCase(value)}?${query.toString()}`
        );
    } else if (activity === ActivityValues.Simulate && value) {
      navigate(
        `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/${activity}/new/${kebabCase(value)}?${SCOPE_QUERY_PARAMS}=${WorkspaceScope.Public}`
      );
    }
  };

  useNextStepOnboarding({ condition: true, tour: workflowTour });

  return (
    <div className="mr-0 ml-3 flex h-full max-h-[calc(100vh-6rem)] flex-col gap-2.5">
      <AnimatePresence mode="wait">
        <motion.div
          key="workflow-scrollable-selector"
          id="workflow-scrollable-selector"
          data-testid="workflow-scrollable-selector"
          className="border-neutral-2 mr-1 rounded-2xl border px-5"
          style={{ willChange: 'opacity' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.2,
            ease: 'easeInOut',
          }}
        >
          <CategoryMenu current={activity} onItemClick={onSelectCategory} />
          <AnimatePresence>
            {activity && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{
                  duration: 0.4,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  opacity: { duration: 0.2 },
                  height: { duration: 0.3 },
                  y: { duration: 0.3 },
                }}
                className="overflow-hidden"
              >
                <TypesMenu category={activity} current={entityType} onItemClick={onSelectType} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
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
