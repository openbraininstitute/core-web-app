'use client';

import { DownOutlined, RightOutlined } from '@ant-design/icons';
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
    children: [
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
    ],
  },
  {
    key: 'activities',
    title: 'Activities',
    url: 'activities',
    requireRole: false,
  },
  {
    key: 'team',
    title: 'Members',
    url: 'team',
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
        {hashedLinks.map(({ title, key, url, baseUrl, children }) => {
          const currentActiveSection = getActiveSection(pathname);
          const hasActiveChild =
            children?.some((child) => !!getActiveSection(pathname, child.key)) ?? false;
          const isActive = currentActiveSection === baseUrl && !hasActiveChild;
          const isExpanded = isActive || hasActiveChild;
          const ArrowIcon = isExpanded ? DownOutlined : RightOutlined;

          return (
            <div key={key} data-menu-item={title} className="w-full">
              <Button
                rounded
                borderless
                asChild
                variant="outline"
                className="h-auto w-full justify-start font-bold shadow-sm"
                size={breakpoint === 'xl' ? 'lg' : 'md'}
                aria-label={isActive ? 'active' : ''}
                active={isActive}
              >
                <Link href={url}>
                  {title}
                  <ArrowIcon className="ml-auto text-current" />
                </Link>
              </Button>
              {children && isExpanded && (
                <div className="pl-6 pr-7 py-4 flex flex-col gap-1.5">
                  {children.map((child) => {
                    const activeSubSection = !!getActiveSection(pathname, child.key);
                    let count = 0,
                      slug = null;
                    if (child.key === 'quick-access') count = qaListCount;
                    if (child.key === 'tutorials') {
                      count = ttListCount;
                      slug = DEFAULT_GET_STARTED_VIDEO_SLUG;
                    }
                    const href = slug ? `${url}/${child.url}/${slug}` : `${url}/${child.url}`;
                    return (
                      <Button
                        rounded
                        borderless
                        asChild
                        key={child.key}
                        variant="outline"
                        className="ml-2 h-auto w-full justify-start font-bold shadow-sm"
                        size={breakpoint === 'xl' ? 'md' : 'sm'}
                        aria-label={activeSubSection ? 'active' : ''}
                        active={activeSubSection}
                      >
                        <Link href={href}>
                          {child.title}
                          {!loadingCounts && (
                            <span
                              className={cn('ml-auto font-light', {
                                'text-gray-500': !activeSubSection,
                                'text-white/70': activeSubSection,
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LeftMenu;
