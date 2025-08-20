'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { Suspense, useState } from 'react';

import { TreeSkeleton } from '@/features/brain-region-hierarchy/brain-region-skeleton';
import { BrainRegionHierarchy } from '@/features/brain-region-hierarchy';
import { EntityLinkCount } from '@/ui/segments/explore/entity-link-count';
import {
  ExploreLeftMenuContext,
  RegionBanner,
} from '@/features/brain-region-hierarchy/region-banner';
import {
  getAllEntitiesCount,
  getElectricalCellRecordingsCount,
} from '@/ui/segments/explore/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { TExploreLeftMenuContext } from '@/features/brain-region-hierarchy/region-banner';
import type { TTreeNode } from '@/components/tree/types';

type Props = { dataKey: string };

export function EntityLeftMenu({ dataKey }: Props) {
  const queryClient = useQueryClient();
  const { virtualLabId, projectId } = useWorkspace();

  const [view, updateView] = useState<TExploreLeftMenuContext>(
    ExploreLeftMenuContext.BrainRegionHierarchy
  );

  const onSwitchView = (_view: TExploreLeftMenuContext) => updateView(_view);

  const onClickBrainRegion = async (node: TTreeNode) => {
    const params = {
      virtualLabId,
      projectId,
      brainRegionId: node.id,
    };

    await queryClient.prefetchQuery({
      queryKey: keyBuilder.dataCount({ ...params }),
      queryFn: () => getAllEntitiesCount({ ...params }),
    });

    await queryClient.prefetchQuery({
      queryKey: keyBuilder.electricalCellRecordingsCount({ ...params }),
      queryFn: () =>
        getElectricalCellRecordingsCount({
          ...params,
        }),
    });
  };

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
                  <BrainRegionHierarchy dataKey={dataKey} onClickCallback={onClickBrainRegion} />
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
            <EntityLinkCount dataKey={dataKey} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
