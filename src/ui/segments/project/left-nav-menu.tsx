'use client';

import { RightOutlined } from '@ant-design/icons';
import { RiCircleFill } from '@remixicon/react';
import { filter } from 'es-toolkit/compat';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ComponentProps, Suspense } from 'react';

import { config } from '@/config';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
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
  {
    key: 'credits',
    title: 'Credits',
    url: 'credits',
    requireRole: true,
  },
];

export function LeftMenu({ className }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  const { isVirtualLabAdmin: isAdmin } = useWorkspaceMembership({ virtualLabId, projectId });
  const pathname = usePathname();

  const hashedLinks = filter(
    links.map((link) => ({
      ...link,
      baseUrl: link.url,
      url: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/${link.url}`,
    })),
    (link) => !link.requireRole || (link.requireRole && isAdmin)
  );

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Suspense fallback={<ProjectCardSkeletonShimmer />}>
        <ProjectCard />
      </Suspense>
      <div className="flex w-full flex-col items-center justify-center gap-2">
        {hashedLinks.map(({ title, key, url, baseUrl, children }) => {
          const currentActiveSection = getActiveSection(pathname);
          const isActive =
            currentActiveSection === baseUrl ||
            (children?.some((child) => !!getActiveSection(pathname, child.url)) ?? false);

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
                  <RightOutlined className="ml-auto text-current" />
                </Link>
              </Button>
              {children && isActive && (
                <div className="pl-2 pr-4 py-4 flex flex-col gap-1.5">
                  {children.map((child) => {
                    const activeSubSection = getActiveSection(pathname, child.url) === child.url;
                    return (
                      <Button
                        key={child.key}
                        rounded
                        borderless
                        asChild
                        variant="ghost"
                        className={cn(
                          'ml-2 h-auto w-full justify-start font-normal text-primary-9',
                          {
                            'font-bold': activeSubSection,
                          }
                        )}
                        size={breakpoint === 'xl' ? 'md' : 'sm'}
                        aria-label={activeSubSection ? 'active' : ''}
                        active={activeSubSection}
                      >
                        <Link href={`${url}/${child.url}`}>
                          {!!getActiveSection(pathname, child.url) && (
                            <RiCircleFill className="text-primary-8 size-3" />
                          )}
                          {child.title}
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
