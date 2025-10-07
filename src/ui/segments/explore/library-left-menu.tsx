import { useQuery } from '@tanstack/react-query';
import { match, P } from 'ts-pattern';
import kebabCase from 'es-toolkit/compat/kebabCase';
import get from 'es-toolkit/compat/get';

import { ExploreDataTypeTabs, tabsConfigItems } from '@/ui/segments/explore/entity-link-count';
import { getProjectBookmarkCategories } from '@/api/virtual-lab-svc/queries/bookmark';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { Card, CardDescription, CardTitle } from '@/ui/molecules/card';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { BrowseLink } from '@/ui/segments/explore/browse-link';
import { ROOT_ROUTE } from '@/config';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { useTabs } from '@/components/detail-view-tabs';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TExploreDataTypeTabs } from '@/ui/segments/explore/entity-link-count';

export function LibraryLeftMenu() {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  const { activeTab, onChangeTab } = useTabs<TExploreDataTypeTabs>({
    tabsConfig: tabsConfigItems,
    tabKey: 'group',
    shallow: true,
  });

  const { isLoading, data } = useQuery({
    queryKey: keyBuilder.bookmarkCategories({ virtualLabId, projectId }),
    queryFn: () => getProjectBookmarkCategories({ virtualLabId, projectId }),
    select: (response) => response.data,
  });

  const entries = Object.entries(data ?? {}).map(([type, value]) => {
    const entity = getEntityByExtendedType({ type: type as TExtendedEntitiesTypeDict });
    return {
      title: entity?.title,
      value,
      type,
      group: entity?.group,
    };
  });

  // Group entries by experimental and model types
  const experimentalEntries = entries.filter(
    (entry) => entry.group === EntityTypeGroup.Experimental
  );
  const modelEntries = entries.filter((entry) => entry.group === EntityTypeGroup.Models);

  const content = match({ activeTab, isLoading, data })
    .with({ isLoading: true }, () => (
      <div className="flex w-full flex-col items-center justify-center gap-1.5">
        <style jsx>{`
          @keyframes opacityShimmerTree {
            0% {
              opacity: 0.6;
            }
            50% {
              opacity: 1;
            }
            100% {
              opacity: 0.6;
            }
          }
          .shine {
            animation: opacityShimmerTree 1.5s ease-in-out infinite;
          }
        `}</style>
        {Array.from({ length: 4 })
          .fill('a')
          .map((p, ind) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={`loading-link-item-${ind}`}
              className="shine h-10 w-full rounded-full bg-gray-100"
            />
          ))}
      </div>
    ))
    .with({ data: P.nullish }, () => (
      <Card className="text-primary-9 w-full p-5">
        <CardTitle className="select-none">Bookmarks</CardTitle>
        <CardDescription className="select-none">
          No bookmarks yet. Select a type above in public or project to get started.
        </CardDescription>
      </Card>
    ))
    .with({ activeTab: ExploreDataTypeTabs.Experimental, data: P.not(P.nullish) }, () => (
      <>
        {experimentalEntries.map((value) => {
          const count: number | null = get(data, value.type, null);
          const link = `${ROOT_ROUTE}/${virtualLabId}/${projectId}/explore/browse/${kebabCase(value.type)}`;
          return (
            <BrowseLink
              key={`link-${value.title}/${value.type}`}
              href={link}
              type={value.type}
              title={value.title ?? ''}
              count={count}
              isLoading={isLoading}
            />
          );
        })}
      </>
    ))
    .with({ activeTab: ExploreDataTypeTabs.Models, data: P.not(P.nullish) }, () => (
      <>
        {modelEntries.map((value) => {
          const count = get(data, value.type, null);
          const link = `${ROOT_ROUTE}/${virtualLabId}/${projectId}/explore/browse/${kebabCase(value.type)}`;
          return (
            <BrowseLink
              key={`link-${value.title}/${value.type}`}
              href={link}
              type={value.type}
              title={value.title ?? ''}
              count={count}
              isLoading={isLoading}
            />
          );
        })}
      </>
    ))
    .otherwise(() => null);

  return (
    <div className="px-4 py-5">
      <PillTabs
        value={activeTab ?? ExploreDataTypeTabs.Experimental}
        defaultValue={activeTab ?? ExploreDataTypeTabs.Experimental}
        className="w-full"
        activationMode="manual"
        onValueChange={(value) => {
          onChangeTab(value as TExploreDataTypeTabs)();
        }}
      >
        <PillTabsList
          className={cn('grid h-10 w-full grid-cols-3 bg-white p-0 shadow-2xl', {
            'h-12': breakpoint === 'xl',
          })}
        >
          {tabsConfigItems.map((tab) => (
            <PillTabsTrigger
              key={tab.key}
              value={tab.key}
              position={tab.position}
              className={cn(
                'data-[state=active]:bg-primary-9 hover:bg-neutral-1 hover:text-primary-8 h-10 px-14! py-3 text-base select-none data-[state=active]:font-bold data-[state=active]:text-white',
                { 'h-12': breakpoint === 'xl' }
              )}
            >
              {tab.title}
            </PillTabsTrigger>
          ))}
        </PillTabsList>
      </PillTabs>
      <div className="my-4 flex w-full flex-col items-center justify-center gap-2">{content}</div>
    </div>
  );
}
