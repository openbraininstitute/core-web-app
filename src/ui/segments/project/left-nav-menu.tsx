'use client';

import { useQueries } from '@tanstack/react-query';
import { filter, sumBy } from 'es-toolkit/compat';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ComponentProps, Suspense } from 'react';

import { config } from '@/config';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { getClient } from '@/services/sanity';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import {
  DEFAULT_GET_STARTED_VIDEO_SLUG,
  getQuickAccessQuery,
  type IQuickAccessList,
  type TTutorial,
  TutorialQuery,
} from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';
import { cn } from '@/utils/css-class';
import { getActiveSection } from '@/utils/get-section';

import { ProjectCard } from './banner/banner';
import { ProjectCardSkeletonShimmer } from './banner/banner-skeleton';

type Props = {
  className?: ComponentProps<'div'>['className'];
};

const links = [
  {
    key: 'get-started',
    title: 'Get started',
    url: '',
    requireRole: false,
  },
  {
    key: 'quick-access',
    title: 'Quick access',
    url: 'quick-access/data',
    requireRole: false,
  },
  {
    key: 'tutorials',
    title: 'Tutorials',
    url: 'tutorials',
    requireRole: false,
  },
  {
    key: 'activities',
    title: 'Activities',
    url: 'activities',
    requireRole: false,
  },
];

export function LeftMenu({ className }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  const { isVirtualLabAdmin: isAdmin, isProjectAdmin } = useWorkspaceMembership({
    virtualLabId,
    projectId,
  });
  const pathname = usePathname();
  const client = getClient();

  const hashedLinks = filter(
    links.map((link) => ({
      ...link,
      baseUrl: link.url,
      url: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/${link.url}`,
    })),
    (link) => !link.requireRole || (link.requireRole && (isAdmin || isProjectAdmin))
  );

  const {
    qaListCount,
    ttListCount,
    isLoading: loadingCounts,
  } = useQueries({
    queries: [
      {
        queryKey: keyBuilderExternal.quickAccessList(),
        queryFn: () => client.fetch<Array<IQuickAccessList>>(getQuickAccessQuery()),
      },
      {
        queryKey: keyBuilderExternal.discoverTutorialsList(),
        queryFn: () => client.fetch<Array<TTutorial>>(TutorialQuery),
      },
    ],
    combine: ([quickAccessList, tutorials]) => {
      return {
        qaListCount: sumBy(quickAccessList.data, (item) => (item.list ?? []).length),
        ttListCount: tutorials?.data?.length ?? 0,
        isLoading: quickAccessList.isLoading || tutorials.isLoading,
      };
    },
  });

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Suspense fallback={<ProjectCardSkeletonShimmer />}>
        <ProjectCard />
      </Suspense>
      <div className="flex w-full flex-col items-center justify-center gap-2">
        {hashedLinks.map(({ title, key, url, baseUrl }) => {
          const isActive = getActiveSection(pathname) === baseUrl;

          let count: number | null = null;
          let href = url;
          if (key === 'quick-access') count = loadingCounts ? null : qaListCount;
          if (key === 'tutorials') {
            count = loadingCounts ? null : ttListCount;
            href = `${url}/${DEFAULT_GET_STARTED_VIDEO_SLUG}`;
          }

          return (
            <Button
              key={key}
              rounded
              borderless
              asChild
              variant="outline"
              className="h-auto w-full justify-start font-bold shadow-sm"
              size={breakpoint === 'xl' ? 'lg' : 'md'}
              aria-label={isActive ? 'active' : ''}
              active={isActive}
            >
              <Link href={href} data-menu-item={title}>
                {title}
                {count !== null && (
                  <span
                    className={cn('ml-auto font-light', {
                      'text-gray-500': !isActive,
                      'text-white/70': isActive,
                    })}
                  >
                    {count}
                  </span>
                )}
              </Link>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default LeftMenu;
