'use client';

import { motion, AnimatePresence } from 'motion/react';
import { CloseOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import { use, useState } from 'react';
import kebabCase from 'lodash/kebabCase';

import { WorkflowActivity } from '@/ui/segments/workflows/elements/workflow-activity';
import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { CategoryMenu } from '@/ui/segments/workflows/elements/category-menu';
import { ActivityValues } from '@/ui/segments/workflows/elements/helpers';
import { TypesMenu } from '@/ui/segments/workflows/elements/types-menu';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';
import { ROOT_ROUTE } from '@/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';

export default function Page({ params }: ServerSideComponentProp<WorkspaceContext, null>) {
  useDisableElementOverflow({ id: 'workspace-body' });
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = use(params);
  const [shouldRenderScrollableSelector, updateShouldRenderScrollableSelector] = useState(false);
  const [shouldOnlyRenderScrollableSelector, updateShouldRenderOnlyScrollableSelector] =
    useState(false);

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
      navigate(
        `${ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/${activity}/configure/${kebabCase(value)}?sessionId=${sessionId}`
      );
    } else if (activity === ActivityValues.Simulate) {
      navigate(
        `${ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/${activity}/new/${kebabCase(value)}`
      );
    }
  };

  const handleActivityChange = (newActivity: TActivityValue | undefined) =>
    updateWorkflowState((prev) => ({ ...prev, activity: newActivity, entityType: undefined }));

  const handleEntityTypeChange = (newEntityType: TExtendedEntitiesTypeDict | undefined) =>
    updateWorkflowState((prev) => ({ ...prev, entityType: newEntityType }));

  const handleShouldRenderScrollableSelector = (s: boolean) =>
    updateShouldRenderScrollableSelector(s);

  const handleShouldOnlyRenderScrollableSelector = (s: boolean) =>
    updateShouldRenderOnlyScrollableSelector(s);

  // const [onboardingState] = useLocalStorage<{
  //   tours: Array<{
  //     tour: string | null;
  //     done: boolean | null;
  //     date: number | null;
  //     step: number | null;
  //   }>;
  // }>(AUTO_ONBOARDING_TOURS, {
  //   tours: [],
  // });

  // useLayoutEffect(() => {
  //   const tourName = shouldRenderScrollableSelector ? workflowTourEmpty : workflowTourFull;
  //   const tour = find(onboardingState.tours, { tour: tourName });

  //   if (!tour || !tour.done) {
  //     startNextStep(tourName);
  //   }
  // }, [shouldRenderScrollableSelector]);

  return (
    <div className="mr-0 ml-3 flex h-full max-h-[calc(100vh-6rem)] flex-col gap-2.5">
      <AnimatePresence mode="wait">
        {!shouldOnlyRenderScrollableSelector && (
          <motion.div
            key="workflow-activity"
            id="workflow-activity"
            data-testid="workflow-activity"
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
            <WorkflowActivity
              onActivityChange={handleActivityChange}
              onEntityTypeChange={handleEntityTypeChange}
              onShouldRenderScrollableSelector={handleShouldRenderScrollableSelector}
              onShouldOnlyRenderScrollableSelector={handleShouldOnlyRenderScrollableSelector}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {(shouldRenderScrollableSelector || shouldOnlyRenderScrollableSelector) && (
          <motion.div
            key="workflow-scrollable-selector"
            id="workflow-scrollable-selector"
            data-testid="workflow-scrollable-selector"
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
            <div
              className={cn('flex w-full items-center justify-between pt-4', {
                'pb-4': shouldOnlyRenderScrollableSelector,
              })}
            >
              <h3 className="text-primary-9 w-max text-xl font-bold">Start a new workflow</h3>
              {shouldOnlyRenderScrollableSelector && (
                <div className="flex items-center justify-end">
                  <motion.div
                    style={{ willChange: 'transform' }}
                    whileTap={{
                      scale: 0.96,
                      rotate: -45,
                      transition: {
                        duration: 0.15,
                        ease: 'easeOut',
                      },
                    }}
                    whileHover={{
                      scale: 1.02,
                      rotate: -5,
                      transition: {
                        duration: 0.2,
                        ease: 'easeOut',
                      },
                    }}
                  >
                    <Button
                      rounded
                      variant="ghost"
                      className="group md:size-10 lg:size-12"
                      onClick={() => updateShouldRenderOnlyScrollableSelector(false)}
                    >
                      <CloseOutlined className="text-primary-9 group-hover:text-primary-8" />
                    </Button>
                  </motion.div>
                </div>
              )}
            </div>

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
        )}
      </AnimatePresence>
    </div>
  );
}
