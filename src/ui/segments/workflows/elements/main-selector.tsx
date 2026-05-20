'use client';

import { AnimatePresence, motion } from 'motion/react';

import { CategoryMenu } from '@/ui/segments/workflows/elements/category-menu';
import { TypesMenu } from '@/ui/segments/workflows/elements/types-menu';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config';

const SELECTOR_PANEL_TRANSITION = {
  duration: 0.2,
  ease: 'easeInOut',
} as const;

const TYPES_PANEL_TRANSITION = {
  duration: 0.4,
  ease: [0.25, 0.46, 0.45, 0.94],
  opacity: { duration: 0.2 },
  height: { duration: 0.3 },
  y: { duration: 0.3 },
} as const;

type Props = {
  /** active workflow category from URL state */
  activity: TActivityValue | null;
  /** active entity type from URL state */
  entityType: TExtendedEntitiesTypeDict | null;
  /** called when the user picks a category; clears type when category changes */
  onSelectCategory: (value: TActivityValue | null) => void;
  /** called when the user picks an entity type (may trigger navigation upstream) */
  onSelectType: (value: TExtendedEntitiesTypeDict | null) => void;
};

type WorkflowTypesPanelProps = {
  activity: TActivityValue;
  entityType: TExtendedEntitiesTypeDict | null;
  onSelectType: (value: TExtendedEntitiesTypeDict | null) => void;
};

function WorkflowTypesPanel({ activity, entityType, onSelectType }: WorkflowTypesPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -20 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, y: -20 }}
      transition={TYPES_PANEL_TRANSITION}
      className="overflow-hidden"
    >
      <TypesMenu category={activity} current={entityType} onItemClick={onSelectType} />
    </motion.div>
  );
}

/**
 * scrollable category and entity-type carousel for the workflows landing page
 *
 * composes {@link CategoryMenu} with an animated {@link TypesMenu} panel when a
 * category is selected. keeps `#workflow-scrollable-selector` for onboarding tours
 */
export function WorkflowMainSelector({
  activity,
  entityType,
  onSelectCategory,
  onSelectType,
}: Props) {
  return (
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
        transition={SELECTOR_PANEL_TRANSITION}
      >
        <CategoryMenu current={activity} onItemClick={onSelectCategory} />
        <AnimatePresence>
          {activity ? (
            <WorkflowTypesPanel
              activity={activity}
              entityType={entityType}
              onSelectType={onSelectType}
            />
          ) : null}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
