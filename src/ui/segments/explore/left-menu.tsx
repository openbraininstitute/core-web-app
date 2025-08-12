'use client';

import { AnimatePresence, motion } from 'motion/react';
import React, { Suspense, useState } from 'react';

import { TreeSkeleton } from '@/features/brain-region-hierarchy/brain-region-skeleton';
import { BrainRegionHierarchy } from '@/features/brain-region-hierarchy';
import { EntityCount } from '@/ui/segments/explore/entity-count';
import {
  ExploreLeftMenuContext,
  RegionBanner,
  TExploreLeftMenuContext,
} from '@/features/brain-region-hierarchy/region-banner';

type Props = { dataKey: string };

export function ExploreMenu({ dataKey }: Props) {
  const [view, updateView] = useState<TExploreLeftMenuContext>(
    ExploreLeftMenuContext.BrainRegionHierarchy
  );

  const onSwitchView = (_view: TExploreLeftMenuContext) => updateView(_view);

  return (
    <div className="flex h-full flex-col">
      <RegionBanner view={view} onSwitchView={onSwitchView} />
      <AnimatePresence mode="wait" initial={false}>
        {view === ExploreLeftMenuContext.BrainRegionHierarchy ? (
          <motion.div
            key="brain-region-hierarchy"
            id="brain-region-hierarchy"
            data-testid="brain-region-hierarchy"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="min-h-0 flex-1 overflow-hidden"
          >
            <Suspense fallback={<TreeSkeleton />}>
              <div className="flex h-full min-h-0 flex-col overflow-hidden">
                <div className="text-primary-9/90 mb-1 px-5 text-base font-bold">Brain region</div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <BrainRegionHierarchy dataKey={dataKey} />
                </div>
              </div>
            </Suspense>
          </motion.div>
        ) : (
          <motion.div
            key="data-type"
            id="data-type"
            data-testid="data-type"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Suspense>
              <EntityCount dataKey={dataKey} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
