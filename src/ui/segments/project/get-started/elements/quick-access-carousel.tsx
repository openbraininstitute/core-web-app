'use client';

import { useAtomValue } from 'jotai';

import { dataPreviewAtom } from '@/ui/segments/project/get-started/elements/data-preview-atom';
import { leftPaneViewAtom } from '@/ui/segments/project/get-started/elements/left-pane-view-atom';
import { SingleCardItem } from '@/ui/segments/project/get-started/elements/quick-access';
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
  QuickAccessGroupDict.Workflows,
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
  const view = useAtomValue(leftPaneViewAtom);
  const collapsed = view !== null && view !== 'tutorials';
  const visibleItems = collapsed ? items.slice(0, 1) : items;
  return (
    <section id={`quick-access-${group}`} className="flex w-full flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-primary-9 text-xl font-bold">{groupLabels[group]}</h2>
      </div>
      {visibleItems.length > 0 ? (
        <div className="flex w-full gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleItems.map((item, index) => {
            const isData = group === QuickAccessGroupDict.Data;
            const isNotebooks = group === QuickAccessGroupDict.Notebooks;
            const isWorkflows = group === QuickAccessGroupDict.Workflows;
            const hideArtifact = isData || isNotebooks || isWorkflows;
            const displayTitle = isData ? (item.artifactTitle ?? item.title) : item.title;
            const previewKindForGroup = isData ? 'data' : isNotebooks ? 'notebook' : null;
            const isSelected =
              previewKindForGroup !== null &&
              preview?.kind === previewKindForGroup &&
              preview?.entityId === item.entity.id;
            const overrideThumbnail =
              isData && index === 0
                ? '/images/quick-access/morphology.png'
                : isData && index === 1
                  ? '/images/quick-access/em-reconstruction.png'
                  : isData && index === 2
                    ? '/images/quick-access/hippocampus.png'
                    : isNotebooks && index === 0
                      ? '/images/quick-access/hippocampus.png'
                      : isWorkflows && index === 0
                        ? '/images/quick-access/morphology.png'
                        : isWorkflows && index === 1
                          ? '/images/quick-access/em-reconstruction.png'
                          : isWorkflows && index === 2
                            ? '/images/quick-access/hippocampus.png'
                            : null;
            return (
              <div key={item.entity.id} className="w-52 shrink-0">
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
    </div>
  );
}
