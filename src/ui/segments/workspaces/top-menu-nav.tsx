import type { ReactNode } from 'react';
import React from 'react';

import { MenuOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  ExploreIcon,
  HelpIcon,
  Home,
  NotebookIcon,
  ReportsIcon,
  WorkflowIcon,
} from '@/components/icons/buttons';
import { ROOT_ROUTE } from '@/config';
import { createBreakpoint, useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';
import { cn } from '@/utils/css-class';
import { getActiveSection } from '@/utils/get-section';

type LinkItem = {
  id: string;
  key: string;
  title: string;
  url: string;
  icon: ReactNode;
  allowText: boolean;
  className: React.ComponentProps<'div'>['className'];
  isActive?: (path: string) => boolean;
  hasAction?: boolean;
  action?: ({ virtualLabId, projectId }: { virtualLabId: string; projectId: string }) => string;
};

const links: Array<LinkItem> = [
  {
    id: 'workspace-home',
    key: 'home',
    title: 'Home',
    url: '',
    icon: <Home className="group-hover:text-primary-3 text-lg" />,
    allowText: false,
    className: 'gap-2 flex items-center justify-center',
    isActive: (pathname: string) => {
      const section = getActiveSection(pathname);
      if (section) return ['overview', 'team', 'credits'].includes(section);
      return false;
    },
    hasAction: false,
  },
  {
    id: 'workspace-explore-data',
    key: 'data',
    title: 'Data',
    url: 'data',
    icon: <ExploreIcon className="group-hover:text-primary-3 text-xl" />,
    allowText: true,
    className: 'px-6 gap-8',
    hasAction: false,
  },
  {
    id: 'workspace-workflows',
    key: 'workflows',
    title: 'Workflows',
    url: 'workflows',
    icon: <WorkflowIcon className="group-hover:text-primary-3 text-xl" />,
    allowText: true,
    className: 'px-6 gap-8',
    hasAction: true,
    action: ({ virtualLabId, projectId }: { virtualLabId: string; projectId: string }) =>
      `${ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows`,
  },
  {
    id: 'workspace-notebooks',
    key: 'notebooks',
    title: 'Notebooks',
    url: 'notebooks',
    icon: <NotebookIcon className="group-hover:text-primary-3 h-5!" />,
    allowText: true,
    className: 'px-6 gap-8',
    hasAction: true,
    action: ({ virtualLabId, projectId }: { virtualLabId: string; projectId: string }) =>
      `${ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks`,
  },
  {
    id: 'workspace-reports',
    key: 'reports',
    title: 'Reports',
    url: 'reports',
    icon: <ReportsIcon className="group-hover:text-primary-3 h-5!" />,
    allowText: true,
    className: 'px-6 gap-8',
    hasAction: true,
    action: ({ virtualLabId, projectId }: { virtualLabId: string; projectId: string }) =>
      `${ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks`,
  },
  {
    id: 'workspace-help',
    key: 'help',
    title: 'Help',
    url: 'help',
    icon: <HelpIcon className="group-hover:text-primary-3 text-lg" />,
    allowText: false,
    className: '',
    hasAction: false,
  },
];

export function TopMenuNavigation() {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();

  const pathname = usePathname();
  const activeSection = getActiveSection(pathname);

  const hashedLinks = links.map((link) => ({
    ...link,
    baseUrl: link.url,
    url: `${ROOT_ROUTE}/${virtualLabId}/${projectId}/${link.url}`,
  }));

  // (after tests:) breakpoint for 950px threshold
  const useCustomBreakpoint = createBreakpoint({ mobile: 0, desktop: 950 });
  const customBreakpoint = useCustomBreakpoint();

  if (customBreakpoint === 'mobile') {
    return (
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="md" rounded className="text-primary-9 h-10 w-10 p-0">
              <MenuOutlined className="text-base" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-neutral-1 w-56 rounded-xl bg-white p-1"
          >
            {hashedLinks.map((link) => {
              if (link.hasAction && link.action) {
                return (
                  <div key={link.key} className="space-y-1">
                    <div className="group">
                      <DropdownMenuItem
                        className="text-primary-9 hover:text-primary-7! flex items-center gap-2 px-3 py-2"
                        asChild
                      >
                        <Link prefetch href={link.url}>
                          {link.icon}
                          <span className="text-lg">{link.title}</span>
                        </Link>
                      </DropdownMenuItem>
                      {/* <DropdownMenuItem
                        className="text-primary-9 hover:text-primary-7! ml-4 h-0 cursor-pointer overflow-hidden px-3 py-0 transition-all duration-200 group-hover:h-auto group-hover:py-2 group-hover:opacity-100"
                        asChild
                      >
                        <Link
                          href={link.action({ virtualLabId, projectId })}
                          className="flex items-center gap-2"
                        >
                          <PlusOutlined />
                          <span className="text-lg">New {link.title.slice(0, -1)}</span>
                        </Link>
                      </DropdownMenuItem> */}
                    </div>
                  </div>
                );
              }

              return (
                <DropdownMenuItem
                  key={link.key}
                  className="text-primary-9 hover:text-primary-7! flex cursor-pointer items-center gap-2 px-3 py-2"
                  asChild
                >
                  <Link prefetch href={link.url}>
                    {link.icon}
                    <span className="text-lg">{link.title}</span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return hashedLinks.map(
    ({ id, key, title, url, baseUrl, icon, allowText, className: clx, isActive, hasAction }) => (
      <div key={key} className="group flex w-max items-center justify-center gap-0">
        <div className="relative flex items-center">
          <Button
            asChild
            rounded
            id={id}
            variant="outline"
            size={breakpoint === 'xl' ? 'lg' : 'md'}
            className={cn(
              { 'w-12! justify-center!': !allowText },
              'group relative flex items-center justify-between',
              { 'group-hover:rounded-r-none group-hover:border-r-0': hasAction },
              'transition-all duration-400 ease-out',
              clx
            )}
            active={activeSection === baseUrl || isActive?.(pathname)}
          >
            <Link prefetch href={url}>
              {allowText && <span>{title}</span>}
              {icon}
            </Link>
          </Button>
          {/* {hasAction && action && (
            <div
              className={cn(
                'transition-all duration-900 ease-out',
                'w-0 scale-0 opacity-0',
                'group-hover:w-auto group-hover:scale-100 group-hover:opacity-100',
                'flex origin-left items-center'
              )}
            >
              <div
                className={cn(
                  'bg-neutral-2 h-[1px] w-0',
                  'transition-all duration-900 ease-out group-hover:w-2',
                  'opacity-0 group-hover:opacity-100'
                )}
              />
              <Button
                variant="outline"
                rounded
                className={cn(
                  'border-neutral-2 hover:bg-primary-9 hover:border-primary-9',
                  'h-12 w-12! bg-transparent p-0 hover:text-white',
                  'rounded-l-none border-l-0',
                  'transition-all duration-900 ease-out',
                  'shadow-md group-hover:shadow-xl',
                  'group-hover:scale-100',
                  { 'h-10! w-10!': breakpoint === 'l' },
                  { 'h-12! w-12!': breakpoint === 'xl' }
                )}
                asChild
              >
                <Link href={action({ virtualLabId, projectId })}>
                  <PlusOutlined />
                </Link>
              </Button>
            </div>
          )} */}
        </div>
      </div>
    )
  );
}
