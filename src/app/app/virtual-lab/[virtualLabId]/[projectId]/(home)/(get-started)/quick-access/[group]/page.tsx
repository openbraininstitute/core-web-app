import { InboxOutlined } from '@ant-design/icons';
import { compact } from 'es-toolkit/array';
import { findKey } from 'es-toolkit/object';

import { tryCatch } from '@/api/utils';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity';
import { SingleCardItem } from '@/ui/segments/project/get-started/elements/quick-access';
import {
  getQuickAccessQuery,
  type IQuickAccessList,
  QuickAccessGroupDict,
} from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { Metadata } from 'next';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

type PageParams = WorkspaceContext & { group: string };

export async function generateMetadata({
  params,
}: ServerSideComponentProp<PageParams, null>): Promise<Metadata> {
  const { group } = await params;
  const capitalizedGroup = findKey(QuickAccessGroupDict, (p) => p === group);
  const title = `Quick Access - ${capitalizedGroup} | Open Brain Institute`;
  const description = `Browse curated ${group} examples to quickly get started with the Open Brain Institute.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

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

  const { data: quickAccessList } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilderExternal.quickAccessList(),
      queryFn: () => client.fetch<Array<IQuickAccessList>>(getQuickAccessQuery()),
    })
  );

  const currentList = quickAccessList?.find((item) => item.group === group);

  const settled = await Promise.allSettled(
    compact(
      currentList?.list?.map((p) => {
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
      artifactTitle: getEntityByExtendedType({ type: a.extendedType })?.title ?? null,
    }));

  if (!results.length) {
    const capitalizedGroup = findKey(QuickAccessGroupDict, (p) => p === group);

    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="flex items-center justify-center size-20 rounded-full bg-primary-1 mb-6">
          <InboxOutlined className="text-primary-6 text-3xl" />
        </div>
        <h2 className="text-primary-8 text-xl font-semibold mb-2">
          No {capitalizedGroup?.toLowerCase() ?? group} examples yet
        </h2>
        <p className="text-neutral-4 text-sm max-w-md leading-relaxed">
          Curated {group} examples for quick access will appear here once they become available.
          Check back soon or explore other categories.
        </p>
      </div>
    );
  }

  return (
    <div
      id={`quick-access-${group}`}
      data-testid={`quick-access-${group}`}
      className="grid grid-cols-3 gap-2 px-3 mb-10"
    >
      {results.map(({ title, thumbnail, entity, extendedType, artifactTitle }) => {
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
              artifactTitle,
            }}
          />
        );
      })}
    </div>
  );
}
