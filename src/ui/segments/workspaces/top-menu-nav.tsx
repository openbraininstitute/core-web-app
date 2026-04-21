import { MenuOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  ExploreIcon,
  HelpIcon,
  Home,
  NotebookIcon,
  ReportsIcon,
  WorkflowIcon,
} from '@/components/icons/buttons';
import { config } from '@/config';
import {
  DEFAULT_BRAIN_REGION_QUERY_ANNOTATION_VALUE,
  DEFAULT_BRAIN_REGION_QUERY_ID,
} from '@/features/brain-region-hierarchy/context';
import { createBreakpoint, useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { cn } from '@/utils/css-class';
import { getActiveSection } from '@/utils/get-section';
import { cleanSearchParams } from '@/utils/search-params';

import type React from 'react';
import type { ReactNode } from 'react';

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

const links: LinkItem[] = [
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
      if (section)
        return ['tutorials', 'quick-access', 'team', 'activities', 'credits'].includes(section);
      return true;
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
      `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows`,
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
      `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks`,
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
      `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks`,
  },
  {
    id: 'workspace-help',
    key: 'help',
    title: 'Help',
    url: 'help',
    icon: <HelpIcon className="group-hover:text-primary-3 h-5! w-5!" />,
    allowText: false,
    className: '',
    hasAction: false,
  },
];

export function TopMenuNavigation() {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  const pathname = usePathname();
  const queryParams = useSearchParams();
  const activeSection = getActiveSection(pathname);
  const { state: aiPanelState, setState: setAiPanelState } = usePanelState();
  const isAiOpen = aiPanelState !== PanelState.Collapsed;

  const hashedLinks = links.map((link) => ({
    ...link,
    baseUrl: link.url,
    url: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/${link.url}`,
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
              const searchParams = new URLSearchParams(queryParams);
              const linkSearchParams = cleanSearchParams({
                searchParams,
                keepKeys: [
                  DEFAULT_BRAIN_REGION_QUERY_ID,
                  DEFAULT_BRAIN_REGION_QUERY_ANNOTATION_VALUE,
                ],
              }).toString();

              if (link.hasAction && link.action) {
                return (
                  <div key={link.key} className="space-y-1">
                    <div className="group">
                      <DropdownMenuItem
                        className="text-primary-9 hover:text-primary-7! flex items-center gap-2 px-3 py-2"
                        asChild
                      >
                        <Link
                          href={{
                            pathname: link.url,
                            query: linkSearchParams,
                          }}
                        >
                          {link.icon}
                          <span className="text-lg">{link.title}</span>
                        </Link>
                      </DropdownMenuItem>
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
                  <Link
                    prefetch
                    href={{
                      pathname: link.url,
                      query: searchParams ? searchParams.toString() : undefined,
                    }}
                  >
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

  return (
    <>
      {hashedLinks.map(
        ({
          id,
          key,
          title,
          url,
          baseUrl,
          icon,
          allowText,
          className: clx,
          isActive,
          hasAction,
        }) => {
          const searchParams = new URLSearchParams(queryParams);
          const linkSearchParams = cleanSearchParams({
            searchParams,
            keepKeys: [DEFAULT_BRAIN_REGION_QUERY_ID, DEFAULT_BRAIN_REGION_QUERY_ANNOTATION_VALUE],
          }).toString();
          const isActiveButton = activeSection === baseUrl || !!isActive?.(pathname);
          const transparentWhenInactive = {
            'bg-transparent! hover:bg-transparent! hover:text-primary-9! hover:shadow-sm':
              !isActiveButton,
          };

          if (id === 'workspace-help') {
            return (
              <div key={key} className="group flex w-max items-center justify-center gap-0">
                <div className="relative flex items-center">
                  <Button
                    asChild
                    rounded
                    id={id}
                    variant="outline"
                    size={breakpoint === 'xl' ? 'lg' : 'md'}
                    className={cn(
                      transparentWhenInactive,
                      { 'w-12 justify-center!': !allowText && breakpoint === 'xl' },
                      { 'w-10! justify-center!': breakpoint === 'l' && !allowText },
                      'group relative flex items-center justify-between',
                      { 'group-hover:rounded-r-none group-hover:border-r-0': hasAction },
                      'transition-all duration-400 ease-out',
                      clx
                    )}
                    active={activeSection === baseUrl || isActive?.(pathname)}
                  >
                    <Link
                      prefetch
                      href={{
                        pathname: url,
                        query: linkSearchParams,
                      }}
                      onClick={(e) => {
                        if (isActiveButton) e.preventDefault();
                      }}
                    >
                      {allowText && <span>{title}</span>}
                      {icon}
                    </Link>
                  </Button>
                  <span className="text-primary-9 absolute top-full left-1/2 -translate-x-1/2 text-sm whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Help
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div key={key} className="group flex w-max items-center justify-center gap-0">
              <div className="relative flex items-center">
                <Button
                  asChild
                  rounded
                  id={id}
                  variant="outline"
                  size={breakpoint === 'xl' ? 'lg' : 'md'}
                  className={cn(
                    transparentWhenInactive,
                    { 'w-12 justify-center!': !allowText && breakpoint === 'xl' },
                    { 'w-10! justify-center!': breakpoint === 'l' && !allowText },
                    'group relative flex items-center justify-between',
                    { 'group-hover:rounded-r-none group-hover:border-r-0': hasAction },
                    'transition-all duration-400 ease-out',
                    clx
                  )}
                  active={activeSection === baseUrl || isActive?.(pathname)}
                >
                  <Link
                    prefetch
                    href={{
                      pathname: url,
                      query: linkSearchParams,
                    }}
                    onClick={(e) => {
                      if (isActiveButton) e.preventDefault();
                    }}
                  >
                    {allowText && <span>{title}</span>}
                    {icon}
                  </Link>
                </Button>
              </div>
            </div>
          );
        }
      )}
      <div className="group flex w-max items-center justify-center gap-0">
        <div className="relative flex items-center">
          <Button
            rounded
            id="workspace-ai-trigger"
            variant="outline"
            size={breakpoint === 'xl' ? 'lg' : 'md'}
            className={cn(
              {
                'bg-transparent! hover:bg-transparent! hover:text-primary-9! hover:shadow-sm':
                  !isAiOpen,
              },
              'font-bold',
              { 'w-12 justify-center!': breakpoint === 'xl' },
              { 'w-10! justify-center!': breakpoint === 'l' },
              'group relative flex items-center justify-center',
              'transition-all duration-400 ease-out'
            )}
            active={isAiOpen}
            aria-pressed={isAiOpen}
            onClick={() => setAiPanelState(isAiOpen ? PanelState.Collapsed : PanelState.Expanded)}
          >
            AI
          </Button>
          <span className="text-primary-9 absolute top-full left-1/2 -translate-x-1/2 text-sm whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            AI Assistant
          </span>
        </div>
      </div>
    </>
  );
}
