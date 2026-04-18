import { compact } from 'es-toolkit/compat';

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

async function resolveGroupItems(
  list: IQuickAccessList | undefined,
  context: WorkspaceContext
): Promise<Array<QuickAccessItem>> {
  const previews = list?.list ?? [];
  const withEntity = compact(
    previews.map((p) => {
      const entityConfig = getEntityByExtendedType({ type: p.extendedType });
      const call = entityConfig?.api.query.one;
      return call
        ? { preview: p, request: call, artifactTitle: entityConfig?.title ?? null }
        : null;
    })
  );
  const settled = await Promise.allSettled(
    withEntity.map(({ preview, request, artifactTitle }) =>
      request({ id: preview.entityId, context }).then((entity) => ({
        preview,
        entity,
        artifactTitle,
      }))
    )
  );
  return settled
    .filter((r) => r.status === 'fulfilled')
    .map((r) => {
      const { preview, entity, artifactTitle } = r.value;
      return {
        entity,
        title: preview.title ?? entity.name,
        description: preview.description ?? entity.description ?? '',
        thumbnail: preview.thumbnail,
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
