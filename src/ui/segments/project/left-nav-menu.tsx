'use client';

import { RightOutlined } from '@ant-design/icons';
import filter from 'es-toolkit/compat/filter';
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
        url: 'quick',
        requireRole: false,
      },
      {
        key: 'tutorials',
        title: 'Tutorials',
        url: 'tutorials',
        requireRole: false,
      },
      {
        key: 'guides',
        title: 'Guides',
        url: 'guides',
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
  const activeSection = getActiveSection(pathname);

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
        {hashedLinks.map(({ title, key, url, baseUrl, children }) => (
          <div key={key} data-menu-item={title} className="w-full">
            <Button
              rounded
              borderless
              asChild
              variant="outline"
              className="h-auto w-full justify-start font-bold shadow-sm"
              size={breakpoint === 'xl' ? 'lg' : 'md'}
              aria-label={activeSection === baseUrl ? 'active' : ''}
              active={activeSection === baseUrl}
            >
              <Link href={url}>
                {title}
                <RightOutlined className="ml-auto text-current" />
              </Link>
            </Button>
            {children && (
              <div className="px-4 w-[calc(100%-1rem)] py-4">
                {children.map((child) => (
                  <Button
                    key={child.key}
                    rounded
                    borderless
                    asChild
                    variant="ghost"
                    className="ml-2 h-auto w-full justify-start font-normal"
                    size={breakpoint === 'xl' ? 'md' : 'sm'}
                    // aria-label={activeSection === child.url ? 'active' : ''}
                    // active={activeSection === child.url}
                  >
                    <Link href={child.url}>
                      {child.title}
                      {/* <RightOutlined className="ml-auto text-current" /> */}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LeftMenu;
