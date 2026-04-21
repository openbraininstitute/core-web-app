import { compact } from 'es-toolkit/compat';

import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity';
import {
  MainCardComingSoon,
  MainCardItem,
  ViewExamples,
} from '@/ui/segments/project/get-started/elements/quick-access';
import {
  getQuickAccessQuery,
  type IQuickAccessList,
  QuickAccessGroupDict,
} from '@/ui/segments/project/get-started/query';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { WorkspaceContext } from '@/types/common';

export async function MainCards({ context }: { context: WorkspaceContext }) {
  const client = getClient();
  const queryClient = getQueryClient();

  const quickAccessList = await client.fetch<Array<IQuickAccessList>>(
    getQuickAccessQuery(),
    {},
    { next: { revalidate: 0 } }
  );

  const virtualLab = await queryClient.fetchQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId: context.virtualLabId }),
    queryFn: () => getVirtualLab(context.virtualLabId),
  });

  const previews = quickAccessList.map((o) => {
    const previewItem = (o.list ?? []).find((a) => a.isPreview);
    return {
      groupTitle: o.title,
      group: o.group,
      ...previewItem,
      listLength: (o.list ?? []).length,
    };
  });

  const withEntity = compact(
    previews
      .filter((p) => p.entityId != null)
      .map((p) => {
        const entityConfig = getEntityByExtendedType({ type: p.extendedType });
        const call = entityConfig?.api.query.one;
        return call ? { preview: p, call, artifactTitle: entityConfig?.title ?? null } : null;
      })
  );

  const settled = await Promise.allSettled(
    withEntity.map(({ preview, call, artifactTitle }) =>
      call({ id: preview.entityId!, context }).then((entity) => ({
        ...preview,
        entity,
        artifactTitle,
      }))
    )
  );

  const withoutEntity = previews
    .filter((p) => p.entityId == null)
    .map((p) => ({
      ...p,
      entity: null,
      artifactTitle: null,
    }));

  const groupOrder = Object.values(QuickAccessGroupDict);
  type FulfilledWithEntity = Extract<(typeof settled)[number], { status: 'fulfilled' }>;

  const results = [
    ...settled
      .filter((r): r is FulfilledWithEntity => r.status === 'fulfilled')
      .map((r) => r.value)
      .map((a) => ({
        ...a,
        title: a.title ?? a.entity.name,
        description: a.description ?? a.entity.description,
      })),
    ...withoutEntity,
  ].sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group));

  return (
    <section
      id="main-data-category-cards"
      data-testid="main-data-category-cards"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 items-stretch w-full"
    >
      {results.map(
        ({
          groupTitle,
          listLength,
          group,
          entityId,
          title,
          description,
          thumbnail,
          entity,
          artifactTitle,
        }) => {
          if (!entity) {
            return (
              <div key={group} className="flex flex-col gap-1.5 w-full">
                <MainCardComingSoon groupTitle={groupTitle ?? group} description="Coming soon" />
                <div className="h-10 xl:h-12" />
              </div>
            );
          }
          return (
            <div key={entityId} className="flex flex-col gap-6 w-full">
              <MainCardItem
                {...{
                  groupTitle,
                  title,
                  thumbnail,
                  description,
                  context,
                  virtualLab,
                  group,
                  entity,
                  artifactTitle,
                }}
              />
              <ViewExamples
                {...{
                  context,
                  group,
                  groupTitle,
                  listLength,
                }}
              />
            </div>
          );
        }
      )}
    </section>
  );
}
