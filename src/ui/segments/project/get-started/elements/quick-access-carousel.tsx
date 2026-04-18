'use client';

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
  [QuickAccessGroupDict.Data]: 'Example Data',
  [QuickAccessGroupDict.Workflows]: 'Example Workflows',
  [QuickAccessGroupDict.Notebooks]: 'Example Notebooks',
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
  return (
    <section id={`quick-access-${group}`} className="flex w-full flex-col">
      <h2 className="text-primary-9 px-2 mb-2 font-medium">{groupLabels[group]}</h2>
      {items.length > 0 ? (
        <div className="flex w-full gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <div key={item.entity.id} className="w-60 shrink-0">
              <SingleCardItem
                compact
                hideArtifact={group === QuickAccessGroupDict.Notebooks}
                title={item.title}
                description={item.description}
                thumbnail={item.thumbnail}
                extendedType={item.extendedType}
                artifactTitle={item.artifactTitle}
                entity={item.entity}
                context={context}
                virtualLab={virtualLab}
                group={group}
              />
            </div>
          ))}
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
    <div className="flex w-full flex-col gap-4">
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
