'use client';

import { motion } from 'motion/react';
import { Suspense, useState } from 'react';

import { BrainRegionHierarchy } from '@/features/brain-region-hierarchy';
import { TreeSkeleton } from '@/features/brain-region-hierarchy/brain-region-skeleton';
import {
  ExploreLeftMenuContext,
  RegionBanner,
} from '@/features/brain-region-hierarchy/region-banner';
import { EntityLinkCount } from '@/ui/segments/explore/entity-link-count';

import type { TTreeNode } from '@/components/tree/types';
import type { TExploreLeftMenuContext } from '@/features/brain-region-hierarchy/region-banner';

type Props = { dataKey: string };

export function EntityLeftMenu({ dataKey }: Props) {
  const [view, updateView] = useState<TExploreLeftMenuContext>(ExploreLeftMenuContext.DataGroup);

  const onSwitchView = (_view: TExploreLeftMenuContext) => updateView(_view);
  const onClickBrainRegion = (_node: TTreeNode) => {
    onSwitchView(ExploreLeftMenuContext.DataGroup);
  };

  return (
    <div className="flex h-full flex-col">
      <RegionBanner view={view} onSwitchView={onSwitchView} />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <motion.div
          key="brain-region-hierarchy"
          id="brain-region-hierarchy"
          data-testid="brain-region-hierarchy"
          initial={false}
          animate={{
            opacity: view === ExploreLeftMenuContext.BrainRegionHierarchy ? 1 : 0,
            y: view === ExploreLeftMenuContext.BrainRegionHierarchy ? 0 : -6,
          }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={`absolute inset-0 ${
            view === ExploreLeftMenuContext.BrainRegionHierarchy
              ? 'pointer-events-auto'
              : 'pointer-events-none'
          }`}
          aria-hidden={view !== ExploreLeftMenuContext.BrainRegionHierarchy}
        >
          <Suspense fallback={<TreeSkeleton />}>
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="text-primary-9/90 mb-1 px-5 text-base font-bold">Brain region</div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <BrainRegionHierarchy dataKey={dataKey} onClickCallback={onClickBrainRegion} />
              </div>
            </div>
          </Suspense>
        </motion.div>
        <motion.div
          key="data-type-container"
          id="data-type-container"
          data-testid="data-type-container"
          initial={false}
          animate={{
            opacity: view === ExploreLeftMenuContext.DataGroup ? 1 : 0,
            y: view === ExploreLeftMenuContext.DataGroup ? 0 : -6,
          }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={`absolute inset-0 ${
            view === ExploreLeftMenuContext.DataGroup
              ? 'pointer-events-auto'
              : 'pointer-events-none'
          }`}
          aria-hidden={view !== ExploreLeftMenuContext.DataGroup}
        >
          <EntityLinkCount />
        </motion.div>
      </div>
    </div>
  );
}
