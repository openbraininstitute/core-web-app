'use client';

import { RiArrowRightLine } from '@remixicon/react';
import { useAtomValue } from 'jotai';
import Link from 'next/link';
import { useRef } from 'react';

import { config } from '@/config';
import { dataPreviewAtom } from '@/ui/segments/project/get-started/elements/data-preview-atom';
import { SingleCardItem } from '@/ui/segments/project/get-started/elements/quick-access';
import { ScrollArrows } from '@/ui/segments/project/get-started/elements/tutorial';
import {
  QuickAccessGroupDict,
  type TQuickAccessGroup,
} from '@/ui/segments/project/get-started/query';

import type { IEntity } from '@/api/entitycore/types/entities/entity';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TVirtualLabResponse } from '@/api/virtual-lab-svc/queries/types';
import type { WorkspaceContext } from '@/types/common';

export type QuickAccessItem = {
  entity: IEntity;
  title: string;
  description: string;
  thumbnail: string | null | undefined;
  extendedType: TExtendedEntitiesTypeDict;
  artifactTitle: string | null;
};

type Props = {
  context: WorkspaceContext;
  virtualLab: TVirtualLabResponse | null;
  groups: Record<TQuickAccessGroup, Array<QuickAccessItem>>;
};

const groupLabels: Record<TQuickAccessGroup, string> = {
  [QuickAccessGroupDict.Data]: 'Data',
  [QuickAccessGroupDict.Workflows]: 'Workflows',
  [QuickAccessGroupDict.Notebooks]: 'Notebooks',
};

const groupOrder: Array<TQuickAccessGroup> = [
  QuickAccessGroupDict.Data,
  QuickAccessGroupDict.Notebooks,
];

function GroupRow({
  group,
  items,
  context,
  virtualLab,
}: {
  group: TQuickAccessGroup;
  items: Array<QuickAccessItem>;
  context: WorkspaceContext;
  virtualLab: TVirtualLabResponse | null;
}) {
  const preview = useAtomValue(dataPreviewAtom);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollBy = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: el.clientWidth * 0.8 * (direction === 'left' ? -1 : 1),
      behavior: 'smooth',
    });
  };
  return (
    <section id={`quick-access-${group}`} className="flex w-full flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-primary-9 text-xl font-bold">{groupLabels[group]}</h2>
        {items.length > 0 && <ScrollArrows onScroll={scrollBy} />}
      </div>
      {items.length > 0 ? (
        <div
          ref={scrollRef}
          className="flex w-full gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => {
            const isData = group === QuickAccessGroupDict.Data;
            const hideArtifact = isData || group === QuickAccessGroupDict.Notebooks;
            const displayTitle = isData ? (item.artifactTitle ?? item.title) : item.title;
            const isSelected = preview?.entityId === item.entity.id;
            const isNotebooks = group === QuickAccessGroupDict.Notebooks;
            const overrideThumbnail =
              isData && index === 0
                ? '/images/quick-access/morphology.png'
                : isData && index === 1
                  ? '/images/quick-access/em-reconstruction.png'
                  : isData && index === 2
                    ? '/images/quick-access/hippocampus.png'
                    : isNotebooks && index === 0
                      ? '/images/quick-access/hippocampus.png'
                      : null;
            return (
              <div key={item.entity.id} className="w-48 shrink-0">
                <SingleCardItem
                  compact
                  hideArtifact={hideArtifact}
                  isSelected={isSelected}
                  title={displayTitle}
                  description={item.description}
                  thumbnail={overrideThumbnail ?? item.thumbnail}
                  extendedType={item.extendedType}
                  artifactTitle={item.artifactTitle}
                  entity={item.entity}
                  context={context}
                  virtualLab={virtualLab}
                  group={group}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-neutral-4 border-neutral-2 rounded-xl border border-dashed px-4 py-6 text-sm">
          No {groupLabels[group].toLowerCase()} available yet.
        </div>
      )}
    </section>
  );
}

function WorkflowsRow({ context }: { context: WorkspaceContext }) {
  const { virtualLabId, projectId } = context;
  return (
    <section id="quick-access-workflows" className="flex w-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-primary-9 text-xl font-bold">Workflows</h2>
      </div>
      <div className="flex w-full gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="w-48 shrink-0">
          <Link
            href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows`}
            className="bg-primary-9 group relative flex aspect-video w-full cursor-pointer select-none items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-transparent text-white shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)] transition-all hover:shadow-bnb"
          >
            <span className="text-lg font-semibold">Go to Workflows</span>
            <RiArrowRightLine className="size-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function QuickAccessCarousel({ context, virtualLab, groups }: Props) {
  return (
    <div className="flex w-full flex-col gap-3">
      {groupOrder.map((g) => (
        <GroupRow
          key={g}
          group={g}
          items={groups[g] ?? []}
          context={context}
          virtualLab={virtualLab}
        />
      ))}
      <WorkflowsRow context={context} />
    </div>
  );
}
