import { compact } from 'es-toolkit/compat';

import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity';
import {
  MainCardComingSoon,
  MainCardItem,
  ViewExamples,
} from '@/ui/segments/project/get-started/elements/quic-access';
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

  const quickAccessList = await client.fetch<Array<IQuickAccessList>>(getQuickAccessQuery());

  const virtualLab = await queryClient.fetchQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId: context.virtualLabId }),
    queryFn: () => getVirtualLab(context.virtualLabId),
  });

  const settled = await Promise.allSettled(
    compact(
      quickAccessList
        .flatMap((o) => ({
          groupTitle: o.title,
          group: o.group,
          ...o.list.find((a) => a.isPreview),
          listLength: o.list.length,
        }))
        .map((p) => {
          const call = getEntityByExtendedType({ type: p.extendedType })?.api.query.one;
          return call ? { preview: p, call } : null;
        })
    )
      .filter((o) => o.preview.entityId !== null)
      .map(({ preview, call }) =>
        call({ id: preview.entityId!, context }).then((entity) => ({
          ...preview,
          entity,
        }))
      )
  );

  const groupOrder = Object.values(QuickAccessGroupDict);

  const results = settled
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value)
    .map((a) => ({
      ...a,
      title: a.title ?? a.entity.name,
      description: a.description ?? a.entity.description,
    }))
    .sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 items-stretch w-full">
      {results.map(
        ({ groupTitle, listLength, group, entityId, title, description, thumbnail, entity }) => {
          if (group === 'workflows') {
            return (
              <div key="workflows" className="flex flex-col gap-1.5 w-full">
                <MainCardComingSoon groupTitle="Workflows" description="Coming soon" />
                <div className="h-10 xl:h-12" />
              </div>
            );
          }
          return (
            <div key={entityId} className="flex flex-col gap-1.5 w-full">
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
    </div>
  );
}
