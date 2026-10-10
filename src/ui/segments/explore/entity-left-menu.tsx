'use client';

import { useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { BrainRegionHierarchy } from '@/features/brain-region-hierarchy';
import { TreeSkeleton } from '@/features/brain-region-hierarchy/components/brain-region-skeleton';
import {
  ExploreLeftMenuContext,
  RegionBanner,
} from '@/features/brain-region-hierarchy/components/region-banner';
import { speciesSelectionModeAtom } from '@/features/brain-region-hierarchy/context';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import { EntityLinkCount } from '@/ui/segments/explore/entity-link-count';
import { getEntityTypeFromUrlOnEntityScope } from '@/ui/segments/explore/helpers';
import { MiniAtlas } from '@/ui/segments/explore/mini-atlas';
import { UploadDataButton } from '@/ui/segments/explore/upload-data-button';

import type { TTreeNode } from '@/components/tree/types';
import type { TExploreLeftMenuContext } from '@/features/brain-region-hierarchy/components/region-banner';

type Props = { dataKey: string };

export function EntityLeftMenu({ dataKey }: Props) {
  const [view, updateView] = useState<TExploreLeftMenuContext>(ExploreLeftMenuContext.DataGroup);
  const speciesSelectionMode = useAtomValue(speciesSelectionModeAtom);
  const isAllMode = speciesSelectionMode === SpeciesSelectionMode.All;
  // the table replaces the big atlas, so a small one stands in for it
  const isTableShowing = !!getEntityTypeFromUrlOnEntityScope(usePathname());

  // while in "all species" mode, force the data-group view so the hierarchy tree is never shown
  useEffect(() => {
    if (isAllMode && view !== ExploreLeftMenuContext.DataGroup) {
      updateView(ExploreLeftMenuContext.DataGroup);
    }
  }, [isAllMode, view]);

  const onSwitchView = (_view: TExploreLeftMenuContext) => {
    if (isAllMode) return;
    updateView(_view);
  };
  const onClickBrainRegion = (_node: TTreeNode) => {
    onSwitchView(ExploreLeftMenuContext.DataGroup);
  };
  const regionBanner = (inCard: boolean) => (
    <RegionBanner
      view={view}
      onSwitchView={onSwitchView}
      classNames={
        inCard
          ? // the white lower part of the mini atlas card
            {
              container: 'ml-0 w-full',
              selector: 'rounded-none rounded-b-[16px] border-t-0 bg-white',
            }
          : { container: 'px-1 w-full pb-1', selector: 'shadow-sm bg-white' }
      }
    />
  );

  return (
    <div
      className="flex h-full flex-col"
      data-testid="data-entity-left-menu"
      id="data-entity-left-menu"
    >
      {isTableShowing ? (
        <MiniAtlas className="mx-1 mt-1 mb-1 w-auto">{regionBanner}</MiniAtlas>
      ) : (
        regionBanner(false)
      )}
      <div
        data-testid="data-entity-left-menu-content"
        id="data-entity-left-menu-content"
        className="relative min-h-0 flex-1 overflow-hidden"
      >
        {!isAllMode && (
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
        )}
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
          className={`absolute inset-0 flex flex-col ${
            view === ExploreLeftMenuContext.DataGroup
              ? 'pointer-events-auto'
              : 'pointer-events-none'
          }`}
          aria-hidden={view !== ExploreLeftMenuContext.DataGroup}
        >
          <EntityLinkCount />
          {/* the table's toolbar carries it while one is showing */}
          {!isTableShowing && <UploadDataButton className="shrink-0 px-1 pt-2 pb-1" />}
        </motion.div>
      </div>
    </div>
  );
}
