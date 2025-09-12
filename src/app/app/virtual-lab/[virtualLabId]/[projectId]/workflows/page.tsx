'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import kebabCase from 'lodash/kebabCase';

import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { CategoryMenu } from '@/ui/segments/workflows/elements/category-menu';
import { TypesMenu } from '@/ui/segments/workflows/elements/types-menu';
import { ROOT_ROUTE } from '@/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import { CategoryValues, type TCategoryValue } from '@/ui/segments/workflows/elements/helpers';

export default function Page({ params }: ServerSideComponentProp<WorkspaceContext, null>) {
  useDisableElementOverflow({ id: 'workspace-body' });

  const { push } = useRouter();
  const { virtualLabId, projectId } = use(params);
  const [{ category, entityType }, updateWorkflowState] = useState<{
    category: TCategoryValue | undefined;
    entityType: TExtendedEntitiesTypeDict | undefined;
  }>({
    category: undefined,
    entityType: undefined,
  });

  const onSelectCategory = (value: TCategoryValue | undefined) => {
    updateWorkflowState(() => ({ category: value, entityType: undefined }));
  };
  const onSelectType = (value: TExtendedEntitiesTypeDict | undefined) => {
    updateWorkflowState((prev) => ({ ...prev, entityType: value }));
    if (category === CategoryValues.Build) {
      const sessionId = crypto.randomUUID();
      push(
        `${ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/${category}/configure/${kebabCase(value)}?sessionId=${sessionId}`
      );
      return;
    }
    push(
      `${ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/${category}/browse/${kebabCase(value)}`
    );
  };

  return (
    <div className="mr-0 mb-10 ml-3 h-max max-h-[calc(100vh-7rem)]">
      <div className="border-neutral-2 mr-1 h-full rounded-2xl border px-5">
        <CategoryMenu current={category} onItemClick={onSelectCategory} />
        <AnimatePresence>
          {category && (
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
              <TypesMenu category={category} current={entityType} onItemClick={onSelectType} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
