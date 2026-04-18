import { tryCatch } from '@/api/utils';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity';
import {
  QuickAccessCarousel,
  type QuickAccessItem,
} from '@/ui/segments/project/get-started/elements/quick-access-carousel';
import {
  getQuickAccessQuery,
  type IQuickAccessList,
  QuickAccessGroupDict,
  type TQuickAccessGroup,
} from '@/ui/segments/project/get-started/query';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { WorkspaceContext } from '@/types/common';

// Abstract scientific illustrations used for the Data / Notebook example cards.
const ABSTRACT_PREVIEW_IMAGES = ['/images/new/new_neuron.jpg', '/images/new/new_ion_channel.png'];

function pickPreviewImage(indexInGroup: number): string {
  return ABSTRACT_PREVIEW_IMAGES[indexInGroup % ABSTRACT_PREVIEW_IMAGES.length];
}

async function resolveGroupItems(
  list: IQuickAccessList | undefined,
  context: WorkspaceContext
): Promise<Array<QuickAccessItem>> {
  const previews = list?.list ?? [];
  const prepared = previews.map((p) => {
    const entityConfig = getEntityByExtendedType({ type: p.extendedType });
    return {
      preview: p,
      request: entityConfig?.api.query.one ?? null,
      artifactTitle: entityConfig?.title ?? null,
    };
  });

  const fetched = await Promise.all(
    prepared.map(async ({ preview, request, artifactTitle }) => {
      if (!request) return { preview, entity: null, artifactTitle };
      try {
        const entity = await request({ id: preview.entityId, context });
        return { preview, entity, artifactTitle };
      } catch {
        return { preview, entity: null, artifactTitle };
      }
    })
  );

  // Keep every item from Sanity, even when the entitycore fetch fails — card
  // still shows with title + thumbnail; interactions that need the full entity
  // will just no-op.
  return fetched.map(({ preview, entity, artifactTitle }, index) => {
    const stubEntity = {
      id: preview.entityId,
      type: preview.extendedType,
      assets: [],
      name: preview.title ?? '',
      description: preview.description ?? '',
    } as unknown as QuickAccessItem['entity'];
    return {
      entity: entity ?? stubEntity,
      title: preview.title ?? (entity?.name as string | undefined) ?? 'Untitled',
      description: preview.description ?? (entity?.description as string | undefined) ?? '',
      thumbnail: pickPreviewImage(index),
      extendedType: preview.extendedType,
      artifactTitle,
    };
  });
}

export async function QuickAccessExamples({ context }: { context: WorkspaceContext }) {
  const client = getClient();
  const queryClient = getQueryClient();

  const quickAccessList = await client.fetch<Array<IQuickAccessList>>(
    getQuickAccessQuery(),
    {},
    { next: { revalidate: 0 } }
  );

  const { data: virtualLab } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilder.getOneLab({ virtualLabId: context.virtualLabId }),
      queryFn: () => getVirtualLab(context.virtualLabId),
    })
  );

  const groupOrder: Array<TQuickAccessGroup> = [
    QuickAccessGroupDict.Data,
    QuickAccessGroupDict.Notebooks,
    QuickAccessGroupDict.Workflows,
  ];

  const results = await Promise.all(
    groupOrder.map((g) =>
      resolveGroupItems(
        quickAccessList.find((l) => l.group === g),
        context
      ).then((items) => [g, items] as const)
    )
  );

  const groups = Object.fromEntries(results) as Record<TQuickAccessGroup, Array<QuickAccessItem>>;

  return <QuickAccessCarousel context={context} virtualLab={virtualLab ?? null} groups={groups} />;
}
