import { compact, flatMap } from 'es-toolkit/compat';

import { getEntity } from '@/api/entitycore/queries/general/entity';
import { getEntityByCoreType } from '@/entity-configuration/domain/helpers';
import { getClient } from '@/services/sanity';
import { Button } from '@/ui/molecules/button';
import { CardItem } from '@/ui/segments/project/get-started/elements/quic-access-card';

import { type IQuickAccessList, QuickAccessQuery } from '../query';

import type { WorkspaceContext } from '@/types/common';

export async function MainCards({ context }: { context: WorkspaceContext }) {
  const client = getClient();
  const quickAccessList = await client.fetch<Array<IQuickAccessList>>(QuickAccessQuery);
  console.log('# # MainCards # quickAccessList:', JSON.stringify(quickAccessList, null, 2));
  const entities = await Promise.allSettled(
    flatMap(
      quickAccessList.map((o) =>
        o.list.filter((p) => p.isPreview).map((s) => getEntity({ id: s.entityId, context }))
      )
    )
  );
  const entities2 = await Promise.allSettled(
    flatMap(
      quickAccessList.map((o) =>
        o.list.filter((p) => !p.isPreview).map((s) => getEntity({ id: s.entityId, context }))
      )
    )
  );
  const fullEntities2 = await Promise.allSettled(
    compact(
      entities2
        .filter((p) => p.status === 'fulfilled')
        .map((o) => {
          const e = getEntityByCoreType({ type: o.value.type });
          if (e)
            return (
              e.api.query.resolve?.({ id: o.value.id, context, populate: ['entity'] }) ??
              e.api.query.one({ id: o.value.id, context })
            );
          return null;
        })
    )
  );
  console.log('# # MainCards # fullEntities2:', fullEntities2);
  const fullEntities = await Promise.allSettled(
    compact(
      entities
        .filter((p) => p.status === 'fulfilled')
        .map((o) => {
          const e = getEntityByCoreType({ type: o.value.type });
          if (e) return e.api.query.one({ id: o.value.id, context });
          return null;
        })
    )
  );

  // function getGroupUrl({ entityId, type }: { entityId: string; type: TEntityTypeDict }) {
  //   const extendedType = getEntityByCoreType({ type });
  //   return `${config.ROOT_ROUTE}/${context.virtualLabId}/${context.projectId}/workflows/view/${kebabCase(entityType)}/${entityId}`;
  // }

  const results = quickAccessList.map((k) => {
    const preview = k.list.find((p) => p.isPreview);
    const en = fullEntities.find((o) => o.id === preview?.entityId);

    return {
      id: en?.id,
      title: preview?.title ?? en?.name,
      description: preview?.description ?? en?.description,
      poster: preview?.thumbnail,
      groupTitle: k.title,
      listLength: k.list.length,
    };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 items-stretch w-full">
      {results.map(({ groupTitle, title, id, description, poster, listLength }) => (
        <div key={id} className="flex flex-col gap-1.5 w-full">
          <CardItem note={groupTitle} title={title} preview={poster} description={description} />
          <Button
            rounded
            size="responsive"
            variant="outline"
            className="w-full bg-background shadow-none hover:font-bold hover:bg-white hover:shadow-md"
          >
            View {groupTitle} examples ({listLength}){' '}
          </Button>
        </div>
      ))}
    </div>
  );
}
