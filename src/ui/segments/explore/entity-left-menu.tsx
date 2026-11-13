'use client';

import { useAtomValue } from 'jotai';
import { RiArrowLeftLine } from '@remixicon/react';
import { snakeCase } from 'es-toolkit/compat';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { config } from '@/config';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { BrainRegionHierarchy } from '@/features/brain-region-hierarchy';
import { TreeSkeleton } from '@/features/brain-region-hierarchy/components/brain-region-skeleton';
import {
  ExploreLeftMenuContext,
  RegionBanner,
} from '@/features/brain-region-hierarchy/components/region-banner';
import { speciesSelectionModeAtom } from '@/features/brain-region-hierarchy/context';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import { CARD_EDGE_CLASS } from '@/features/data-grid/react/molecules-theme';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { EntityLinkCount } from '@/ui/segments/explore/entity-link-count';
import { getEntityTypeFromUrlOnEntityScope } from '@/ui/segments/explore/helpers';
import { MiniAtlas } from '@/ui/segments/explore/mini-atlas';
import { UploadDataButton } from '@/ui/segments/explore/upload-data-button';

import type { TTreeNode } from '@/components/tree/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TExploreLeftMenuContext } from '@/features/brain-region-hierarchy/components/region-banner';

type Props = { dataKey: string };

export function EntityLeftMenu({ dataKey }: Props) {
  const [view, updateView] = useState<TExploreLeftMenuContext>(ExploreLeftMenuContext.DataGroup);
  const speciesSelectionMode = useAtomValue(speciesSelectionModeAtom);
  const isAllMode = speciesSelectionMode === SpeciesSelectionMode.All;
  const tableSlug = getEntityTypeFromUrlOnEntityScope(usePathname());
  const isTableShowing = !!tableSlug;
  const { virtualLabId, projectId } = useWorkspace();
  const query = useSearchParams().toString();

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
      classNames={{
        container: inCard ? 'ml-0 w-full' : 'ml-0 px-1 w-full pb-1',
        selector: inCard
          ? 'rounded-none rounded-b-3xl border-transparent bg-white'
          : `border-transparent bg-white ${CARD_EDGE_CLASS}`,
      }}
    />
  );

  const phone = useMediaQuery('(max-width: 767px)', false);
  // On a phone, down the page and no big atlas (the user asked): the mini atlas with the species and region under
  // it, then the data types, or the region tree while it is open. Over a type's table no atlas at all (the user
  // asked), but the way back to the data types, the type shown, and the species and region.
  if (phone)
    return (
      <div className="flex flex-col gap-2" data-testid="data-entity-left-menu" id="data-entity-left-menu">
        {isTableShowing ? (
          <>
            <div className="flex items-center gap-2 px-1">
              <Link
                href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data${query ? `?${query}` : ''}`}
                className="text-primary-9 border-neutral-2 flex h-9 shrink-0 items-center gap-1.5 rounded-full border bg-white px-3 text-[13px] font-semibold"
              >
                <RiArrowLeftLine className="size-4" />
                Data types
              </Link>
              <span className="text-primary-9 min-w-0 truncate text-[17px] font-bold">
                {getEntityByExtendedType({ type: snakeCase(tableSlug) as TExtendedEntitiesTypeDict })?.title ?? ''}
              </span>
            </div>
            {regionBanner(false)}
          </>
        ) : (
          <MiniAtlas morph={false}>{regionBanner}</MiniAtlas>
        )}
        {!isAllMode && view === ExploreLeftMenuContext.BrainRegionHierarchy ? (
          <Suspense fallback={<TreeSkeleton />}>
            <div className="h-[60vh] min-h-0 overflow-hidden">
              <BrainRegionHierarchy dataKey={dataKey} onClickCallback={onClickBrainRegion} />
            </div>
          </Suspense>
        ) : (
          !isTableShowing && (
            <div className="flex flex-col">
              <EntityLinkCount />
              <UploadDataButton className="shrink-0 px-1 pt-2" />
            </div>
          )
        )}
      </div>
    );

  return (
    <div
      className="flex h-full flex-col"
      data-testid="data-entity-left-menu"
      id="data-entity-left-menu"
    >
      {isTableShowing ? <MiniAtlas>{regionBanner}</MiniAtlas> : regionBanner(false)}
      <div
        data-testid="data-entity-left-menu-content"
        id="data-entity-left-menu-content"
        className="relative min-h-0 flex-1 overflow-x-clip"
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
          className={`no-scrollbar absolute inset-0 flex flex-col overflow-y-auto ${
            view === ExploreLeftMenuContext.DataGroup
              ? 'pointer-events-auto'
              : 'pointer-events-none'
          }`}
          aria-hidden={view !== ExploreLeftMenuContext.DataGroup}
        >
          <EntityLinkCount />
          {!isTableShowing && <UploadDataButton className="shrink-0 px-1 pt-2" />}
        </motion.div>
      </div>
    </div>
  );
}
