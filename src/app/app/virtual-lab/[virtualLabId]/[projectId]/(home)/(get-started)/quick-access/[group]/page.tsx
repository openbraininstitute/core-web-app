import { compact } from 'es-toolkit/array';
import { findKey } from 'es-toolkit/object';
import Link from 'next/link';
import { ViewTransition } from 'react';

import { tryCatch } from '@/api/utils';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { config } from '@/config';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity';
import { Button } from '@/ui/molecules/button';
import { MainCardItem } from '@/ui/segments/project/get-started/elements/quick-access';
import {
  getQuickAccessQuery,
  type IQuickAccessList,
  QuickAccessGroupDict,
} from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import { QuickAccessEmptyState } from './quick-access-empty-state';

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

export default async function Page({
  params,
}: ServerSideComponentProp<WorkspaceContext & { group: string }, null>) {
  const { group, ...context } = await params;
  const client = getClient();
  const queryClient = getQueryClient();

  const { data: virtualLab } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilder.getOneLab({ virtualLabId: context.virtualLabId }),
      queryFn: () => getVirtualLab({ id: context.virtualLabId }),
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

  type FulfilledResult = Extract<(typeof settled)[number], { status: 'fulfilled' }>;

  const results = settled
    .filter((r): r is FulfilledResult => r.status === 'fulfilled')
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
      <QuickAccessEmptyState
        group={group}
        capitalizedGroup={capitalizedGroup}
        workflowsHref={`${config.ROOT_ROUTE}/${context.virtualLabId}/${context.projectId}/workflows`}
        showWorkflowsLink={group === QuickAccessGroupDict.Workflows}
      />
    );
  }

  if (!virtualLab) return null;

  return (
    <ViewTransition enter="vt-slide-up-enter" exit="vt-fade-exit">
      <div
        id={`quick-access-${group}`}
        data-testid={`quick-access-${group}`}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 items-stretch w-full mt-2 mb-10"
      >
        {results.map(({ title, thumbnail, entity, artifactTitle, description }) => {
          return (
            <MainCardItem
              key={entity.id}
              {...{
                groupTitle: findKey(QuickAccessGroupDict, (p) => p === group),
                title,
                thumbnail,
                context,
                virtualLab,
                group: group as (typeof QuickAccessGroupDict)[keyof typeof QuickAccessGroupDict],
                entity,
                artifactTitle,
                description,
              }}
            />
          );
        })}
      </div>
    </ViewTransition>
  );
}
