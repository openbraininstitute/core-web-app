import { compact } from 'es-toolkit/array';

import { tryCatch } from '@/api/utils';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity';
import { SingleCardItem } from '@/ui/segments/project/get-started/elements/quic-access';
import { type IQuickAccessList, QuickAccessQuery } from '@/ui/segments/project/get-started/query';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Layout({
  params,
}: ServerSideComponentProp<WorkspaceContext & { group: string }, null>) {
  const { group, ...context } = await params;
  const client = getClient();
  const queryClient = getQueryClient();

  const { data: virtualLab } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilder.getOneLab({ virtualLabId: context.virtualLabId }),
      queryFn: () => getVirtualLab(context.virtualLabId),
    })
  );

  const quickAccessList = await client.fetch<Array<IQuickAccessList>>(QuickAccessQuery);
  const currentList = quickAccessList.find((item) => item.group === group);

  const settled = await Promise.allSettled(
    compact(
      currentList?.list.map((p) => {
        const rq = getEntityByExtendedType({ type: p.extendedType })?.api.query.one;
        return rq ? { preview: p, request: rq } : null;
      }) ?? []
    ).map(({ preview, request }) =>
      request({ id: preview.entityId, context }).then((entity) => ({
        ...preview,
        entity,
      }))
    )
  );

  const results = settled
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value)
    .map((a) => ({
      ...a,
      title: a.title ?? a.entity.name,
      description: a.description ?? a.entity.description,
    }));

  return (
    <div
      id={`quick-access-${group}`}
      data-testid={`quick-access-${group}`}
      className="grid grid-cols-3 gap-2 pr-2 mb-10"
    >
      {results.map(({ title, thumbnail, entity, extendedType }) => {
        return (
          <SingleCardItem
            key={entity.id}
            {...{
              title,
              thumbnail,
              context,
              virtualLab,
              group,
              entity,
              extendedType,
            }}
          />
        );
      })}
    </div>
  );
}
