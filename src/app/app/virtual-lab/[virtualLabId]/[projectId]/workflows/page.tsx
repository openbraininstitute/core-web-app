'use client';

import { motion, AnimatePresence } from 'motion/react';
import { use, useRef, useState } from 'react';
import { useRouter } from '@bprogress/next';
import kebabCase from 'es-toolkit/compat/kebabCase';

import { useNextStepOnboarding, workflowTour } from '@/ui/segments/app-setup/discover-app';
import { WorkflowActivity } from '@/ui/segments/workflows/elements/workflow-activity';
import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { CategoryMenu } from '@/ui/segments/workflows/elements/category-menu';
import { ActivityValues } from '@/ui/segments/workflows/elements/helpers';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { TypesMenu } from '@/ui/segments/workflows/elements/types-menu';
import { ROOT_ROUTE } from '@/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';

export default function Page({ params }: ServerSideComponentProp<WorkspaceContext, null>) {
  useDisableElementOverflow({ id: 'workspace-body' });

  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = use(params);

  const tableRef = useRef<HTMLDivElement>(null);
  const [{ activity, entityType }, updateWorkflowState] = useState<{
    activity: TActivityValue | undefined;
    entityType: TExtendedEntitiesTypeDict | undefined;
  }>({
    activity: undefined,
    entityType: undefined,
  });

  const onSelectCategory = (value: TActivityValue | undefined) => {
    updateWorkflowState(() => ({ activity: value, entityType: undefined }));
  };

  const onSelectType = (value: TExtendedEntitiesTypeDict | undefined) => {
    updateWorkflowState((prev) => ({ ...prev, entityType: value }));
    if (activity === ActivityValues.Build) {
      const sessionId = crypto.randomUUID();
      const query = new URLSearchParams();
      query.set('sessionId', sessionId);
      query.set(PanelQueryParam, WorkflowSimulatePanels.Configuration);
      navigate(
        `${ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/${activity}/configure/${kebabCase(value)}?${query.toString()}`
      );
    } else if (activity === ActivityValues.Simulate) {
      navigate(
        `${ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/${activity}/new/${kebabCase(value)}`
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
          <WorkflowActivity ref={tableRef} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
