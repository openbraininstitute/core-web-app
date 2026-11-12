'use client';

import { CloseOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { type PointerEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { DATA_LISTING_PROPS } from '@/constants';
import { BrainRegionHierarchy } from '@/features/brain-region-hierarchy';
import { TreeSkeleton } from '@/features/brain-region-hierarchy/components/brain-region-skeleton';
import {
  ExploreLeftMenuContext,
  RegionBanner,
} from '@/features/brain-region-hierarchy/components/region-banner';
import { speciesSelectionModeAtom } from '@/features/brain-region-hierarchy/context';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import { CARD_EDGE_CLASS } from '@/features/data-grid/react/molecules-theme';
import { useFlags } from '@/features/feature-flags';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { SegmentedTabs } from '@/ui/molecules/tabs/segmented-tabs';
import {
  BrowseExperimentalDataExtendedTypes,
  DataSectionDataTypeTabsConfig,
  ExploreDataTypeTabs,
  ModelDataExtendedTypes,
  SimulationDataExtendedTypes,
  type TExploreDataTypeTabs,
} from '@/ui/segments/explore/helpers';
import { cn } from '@/utils/css-class';
import { AppUInterfaceSection, resolveDataKey } from '@/utils/key-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { TTreeNode } from '@/components/tree/types';
import type { TExploreLeftMenuContext } from '@/features/brain-region-hierarchy/components/region-banner';

export type LinkedEntity = { id: string; name: string; type: TExtendedEntitiesTypeDict };

type TypeEntry = {
  title: string;
  extendedType: TExtendedEntitiesTypeDict;
  requiredFeatures?: string[];
};

const TYPES_BY_TAB: Record<TExploreDataTypeTabs, TypeEntry[]> = {
  [ExploreDataTypeTabs.Experimental]: Object.values(BrowseExperimentalDataExtendedTypes),
  [ExploreDataTypeTabs.Models]: Object.values(ModelDataExtendedTypes),
  [ExploreDataTypeTabs.Simulations]: Object.values(SimulationDataExtendedTypes),
};

const SEGMENTS = DataSectionDataTypeTabsConfig.map((tab) => ({
  value: tab.key,
  label: tab.title,
  id: `link-type-tab-${tab.key}`,
}));

type Basket = Partial<Record<TExtendedEntitiesTypeDict, EntityCoreIdentifiableNamed[]>>;

/**
 * A floating window to pick entities from the Data browser: the species selector and entity
 * types on the left, the Data table (search, filters, scope) on the right. Ticked rows are
 * kept per type and handed over together by "Add".
 */
export function LinkEntitiesWindow({
  onAdd,
  onClose,
}: {
  onAdd: (entities: LinkedEntity[]) => void;
  onClose: () => void;
}) {
  const { projectId } = useWorkspace();
  const flags = useFlags();
  const dataKey = resolveDataKey({ projectId, section: AppUInterfaceSection.Data });
  const speciesMode = useAtomValue(speciesSelectionModeAtom);
  const isAllMode = speciesMode === SpeciesSelectionMode.All;

  const [tab, setTab] = useState<TExploreDataTypeTabs>(ExploreDataTypeTabs.Experimental);
  const [type, setType] = useState<TExtendedEntitiesTypeDict>(
    TYPES_BY_TAB[ExploreDataTypeTabs.Experimental][0].extendedType
  );
  const [view, setView] = useState<TExploreLeftMenuContext>(ExploreLeftMenuContext.DataGroup);
  const [basket, setBasket] = useState<Basket>({});

  // "all species" has no hierarchy to show
  useEffect(() => {
    if (isAllMode) setView(ExploreLeftMenuContext.DataGroup);
  }, [isAllMode]);

  const total = useMemo(
    () => Object.values(basket).reduce((sum, rows) => sum + (rows?.length ?? 0), 0),
    [basket]
  );

  const add = () =>
    onAdd(
      Object.entries(basket).flatMap(([entityType, rows]) =>
        (rows ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          type: entityType as TExtendedEntitiesTypeDict,
        }))
      )
    );

  const items = TYPES_BY_TAB[tab].filter(
    (entry) =>
      !entry.requiredFeatures || entry.requiredFeatures.every((flag) => flags?.[flag as never])
  );

  const { style, headerProps, panelRef } = useFloating();

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Link entities"
      data-testid="link-entities-window"
      style={style}
      className="bg-background border-neutral-2 fixed z-[1100] flex h-[min(46rem,88vh)] w-[min(78rem,96vw)] flex-col overflow-hidden rounded-2xl border shadow-2xl"
    >
      <div
        {...headerProps}
        className="border-neutral-2 flex shrink-0 cursor-move touch-none items-center justify-between border-b bg-white px-5 py-3 select-none"
      >
        <span className="text-primary-9 text-lg font-bold">Link entities</span>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-primary-9 hover:bg-neutral-1 flex size-8 items-center justify-center rounded-full"
        >
          <CloseOutlined />
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[22rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-4 p-2 [grid-template-areas:'aside_body']">
        <aside className="-ml-1 flex min-h-0 flex-col overflow-x-clip px-1 [grid-area:aside]">
          <RegionBanner
            view={view}
            onSwitchView={(next) => !isAllMode && setView(next)}
            classNames={{
              container: 'ml-0 px-1 w-full pb-1',
              selector: `border-transparent bg-white ${CARD_EDGE_CLASS}`,
            }}
          />
          <div className="relative min-h-0 flex-1 overflow-x-clip">
            {!isAllMode && (
              <motion.div
                initial={false}
                animate={{
                  opacity: view === ExploreLeftMenuContext.BrainRegionHierarchy ? 1 : 0,
                  y: view === ExploreLeftMenuContext.BrainRegionHierarchy ? 0 : -6,
                }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={cn(
                  'absolute inset-0',
                  view === ExploreLeftMenuContext.BrainRegionHierarchy
                    ? 'pointer-events-auto'
                    : 'pointer-events-none'
                )}
                aria-hidden={view !== ExploreLeftMenuContext.BrainRegionHierarchy}
              >
                <Suspense fallback={<TreeSkeleton />}>
                  <div className="flex h-full min-h-0 flex-col overflow-hidden">
                    <div className="text-primary-9/90 mb-1 px-5 text-base font-bold">
                      Brain region
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <BrainRegionHierarchy
                        dataKey={dataKey}
                        onClickCallback={(_node: TTreeNode) =>
                          setView(ExploreLeftMenuContext.DataGroup)
                        }
                      />
                    </div>
                  </div>
                </Suspense>
              </motion.div>
            )}
            <motion.div
              initial={false}
              animate={{
                opacity: view === ExploreLeftMenuContext.DataGroup ? 1 : 0,
                y: view === ExploreLeftMenuContext.DataGroup ? 0 : -6,
              }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={cn(
                'no-scrollbar absolute inset-0 flex flex-col overflow-y-auto',
                view === ExploreLeftMenuContext.DataGroup
                  ? 'pointer-events-auto'
                  : 'pointer-events-none'
              )}
              aria-hidden={view !== ExploreLeftMenuContext.DataGroup}
            >
              <div
                className={cn(
                  'mx-1 mt-2 flex min-h-0 flex-1 flex-col rounded-3xl border border-white/70 p-2',
                  'bg-white/75 backdrop-blur-xl backdrop-saturate-150',
                  CARD_EDGE_CLASS
                )}
              >
                <SegmentedTabs
                  id="link-entities-type-group"
                  aria-label="Data type"
                  value={tab}
                  onValueChange={(value) => {
                    const next = value as TExploreDataTypeTabs;
                    setTab(next);
                    setType(TYPES_BY_TAB[next][0].extendedType);
                  }}
                  segments={SEGMENTS}
                  segmentClassName="text-base"
                />
                <div className="secondary-scrollbar mt-2 -mr-2 flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto py-1 pr-0.5 [scrollbar-gutter:stable]">
                  {items.map((entry) => {
                    const active = entry.extendedType === type;
                    const picked = basket[entry.extendedType]?.length ?? 0;
                    return (
                      <Button
                        key={entry.extendedType}
                        rounded
                        variant="outline"
                        size="lg"
                        active={active}
                        onClick={() => setType(entry.extendedType)}
                        className="w-full shrink-0 justify-between border-none text-base"
                      >
                        <span className="min-w-0 truncate font-bold">{entry.title}</span>
                        {picked > 0 && (
                          <span
                            className={cn(
                              'rounded-full px-2 text-xs font-bold',
                              active ? 'bg-white text-primary-9' : 'bg-primary-9 text-white'
                            )}
                          >
                            {picked}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </aside>

        <BrowseEntityScope
          key={type}
          {...DATA_LISTING_PROPS}
          dataType={type}
          allowUpload={false}
          allowDownload={false}
          allowDelete={false}
          requireMiniDetailView={false}
          mainTableProps={{
            selectionType: 'checkbox',
            selectedRows: basket[type] ?? [],
            onRowsSelected: (rows) => setBasket((prev) => ({ ...prev, [type]: rows })),
            // a row click would open the mini-detail panel, which this window has no room for
            onCellClick: () => undefined,
          }}
        />
      </div>

      <div className="border-neutral-2 flex shrink-0 items-center justify-between border-t bg-white px-5 py-3">
        <span className="text-primary-9 text-sm">
          {total === 0 ? 'Tick rows to link them' : `${total} selected`}
        </span>
        <div className="flex gap-2">
          {total > 0 && (
            <Button rounded variant="ghost" onClick={() => setBasket({})}>
              Clear
            </Button>
          )}
          <Button rounded variant="success" className="px-6" disabled={total === 0} onClick={add}>
            {total === 0 ? 'Add' : `Add ${total}`}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Centred until the header is dragged; then it follows the pointer, kept inside the viewport. */
function useFloating() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const grab = useRef<{ dx: number; dy: number } | null>(null);

  const headerProps = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      grab.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const g = grab.current;
      const rect = panelRef.current?.getBoundingClientRect();
      if (!g || !rect) return;
      setPos({
        x: Math.min(Math.max(e.clientX - g.dx, 0), window.innerWidth - rect.width),
        y: Math.min(Math.max(e.clientY - g.dy, 0), window.innerHeight - 48),
      });
    },
    onPointerUp: () => {
      grab.current = null;
    },
  };

  const style = pos
    ? { left: pos.x, top: pos.y }
    : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  return { style, headerProps, panelRef };
}
