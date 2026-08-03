import { MenuOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  ExploreIcon,
  HelpIcon,
  Home,
  NotebookIcon,
  ReportsIcon,
  WorkflowIcon,
} from '@/components/icons/buttons';
import { FeedbackStarIcon } from '@/components/icons/FeedbackStarIcon';
import { config } from '@/config';
import { WorkspaceMainPages } from '@/constants';
import { lastSectionLocationAtom } from '@/state/section-location';
import { createBreakpoint, useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';
import { cn } from '@/utils/css-class';
import { getActiveSection } from '@/utils/get-section';
import { WORKSPACE_NAV_BACK, WORKSPACE_NAV_FORWARD } from '@/utils/workspace-view-transition';

import type React from 'react';
import type { ReactNode } from 'react';

// Dynamically import FeedbackModal with SSR disabled to prevent Suspense boundary issues
const FeedbackModal = dynamic(() => import('@/ui/segments/feedbacks/feedback-modal'), {
  ssr: false,
});

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
    icon: <Home className="group-hover:text-primary-3 size-5! shrink-0 -translate-y-0.5" />,
    allowText: false,
    className: '',
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
    url: WorkspaceMainPages.Data,
    icon: <ExploreIcon className="group-hover:text-primary-3 size-5! shrink-0" />,
    allowText: true,
    className: 'px-6 gap-2',
    hasAction: false,
  },
  {
    id: 'workspace-workflows',
    key: 'workflows',
    title: 'Workflows',
    url: WorkspaceMainPages.Workflows,
    icon: <WorkflowIcon className="group-hover:text-primary-3 size-5! shrink-0" />,
    allowText: true,
    className: 'px-6 gap-2',
    hasAction: true,
    action: ({ virtualLabId, projectId }: { virtualLabId: string; projectId: string }) =>
      `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows`,
  },
  {
    id: 'workspace-notebooks',
    key: 'notebooks',
    title: 'Notebooks',
    url: WorkspaceMainPages.Notebooks,
    icon: <NotebookIcon className="group-hover:text-primary-3 size-5! shrink-0" />,
    allowText: true,
    className: 'px-6 gap-2',
    isActive: (pathname: string) => getActiveSection(pathname) === 'notebooks',
    hasAction: true,
    action: ({ virtualLabId, projectId }: { virtualLabId: string; projectId: string }) =>
      `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks/browse/${ExtendedEntitiesTypeDict.AnalysisNotebookTemplate}`,
  },
  {
    id: 'workspace-reports',
    key: 'reports',
    title: 'Reports',
    url: WorkspaceMainPages.Reports,
    icon: <ReportsIcon className="group-hover:text-primary-3 size-[17px]! shrink-0" />,
    allowText: true,
    className: 'px-6 gap-2',
    hasAction: false,
  },
  {
    id: 'workspace-help',
    key: 'help',
    title: 'Help',
    url: 'help',
    icon: <HelpIcon className="group-hover:text-primary-3 size-[17px]! shrink-0" />,
    allowText: false,
    className: '',
    hasAction: false,
  },
  {
    id: 'workspace-feedbacks',
    key: 'feedbacks',
    title: 'Feedback',
    url: 'feedback',
    icon: <FeedbackStarIcon className="group-hover:text-primary-3 size-6! shrink-0" />,
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
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const lastSectionLocation = useAtomValue(lastSectionLocationAtom);
  const workspacePrefix = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}`;

  const hashedLinks = links.map((link) => {
    // Tabs of sections you are not currently in link back to the last visited
    // page of that section (when recorded for this workspace); the active
    // tab always resets to its section root.
    const isCurrentSection = activeSection === link.url || link.isActive?.(pathname);
    const remembered = lastSectionLocation[link.url];
    const url =
      !isCurrentSection && remembered?.startsWith(`${workspacePrefix}/`)
        ? remembered
        : `${workspacePrefix}/${link.url}`;

    return { ...link, baseUrl: link.url, url };
  });

  const activeIndex = hashedLinks.findIndex(
    (link) =>
      link.id !== 'workspace-feedbacks' &&
      (activeSection === link.baseUrl || link.isActive?.(pathname))
  );

  // The workspace <ViewTransition> slides the section in from the side the
  // target tab sits on relative to the active one.
  const getTransitionTypes = (index: number) => {
    if (activeIndex === -1 || index === activeIndex) return undefined;
    return index > activeIndex ? [WORKSPACE_NAV_FORWARD] : [WORKSPACE_NAV_BACK];
  };

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
            {hashedLinks.map((link, index) => {
              if (link.id === 'workspace-feedbacks') {
                return (
                  <DropdownMenuItem
                    key={link.key}
                    className="text-primary-9 hover:text-primary-7! flex cursor-pointer items-center gap-2 px-3 py-2"
                    onClick={() => setIsFeedbackModalOpen(true)}
                  >
                    {link.icon}
                    <span className="text-lg">{link.title}</span>
                  </DropdownMenuItem>
                );
              }

              if (link.hasAction && link.action) {
                return (
                  <div key={link.key} className="space-y-1">
                    <div className="group">
                      <DropdownMenuItem
                        className="text-primary-9 hover:text-primary-7! flex items-center gap-2 px-3 py-2"
                        asChild
                      >
                        <Link href={link.url} transitionTypes={getTransitionTypes(index)}>
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
                  <Link prefetch href={link.url} transitionTypes={getTransitionTypes(index)}>
                    {link.icon}
                    <span className="text-lg">{link.title}</span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        {isFeedbackModalOpen && (
          <FeedbackModal open={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} />
        )}
      </div>
    );
  }

  return (
    <>
      {hashedLinks.map(
        (
          { id, key, title, url, baseUrl, icon, allowText, className: clx, isActive, hasAction },
          index
        ) => {
          if (id === 'workspace-feedbacks') {
            const isActive = activeSection === baseUrl;
            return (
              <div key={key} className="group flex w-max items-center justify-center gap-0">
                <div className="relative flex items-center">
                  <Badge
                    rounded
                    id={id}
                    variant="outline"
                    size={breakpoint === 'xl' ? 'lg' : 'md'}
                    className={cn(
                      {
                        'w-12 !justify-center !px-0': !allowText && breakpoint === 'xl',
                      },
                      {
                        '!w-10 !justify-center !px-0': breakpoint === 'l' && !allowText,
                      },
                      'group relative flex items-center justify-center cursor-pointer',
                      '!overflow-visible !py-0 bg-white select-none hover:shadow-sm hover:bg-background',
                      { 'bg-primary-9 text-white': isActive },
                      'transition-all duration-400 ease-out',
                      clx
                    )}
                    onClick={() => setIsFeedbackModalOpen(true)}
                  >
                    {allowText && <span className="group-hover:text-primary-3">{title}</span>}
                    {icon}
                  </Badge>
                  <span className="text-primary-9 absolute top-full right-0 text-sm whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Feedback
                  </span>
                </div>
              </div>
            );
          }

          if (id === 'workspace-help') {
            const isActiveHelp = activeSection === baseUrl || isActive?.(pathname);
            return (
              <div key={key} className="group flex w-max items-center justify-center gap-0">
                <div className="relative flex items-center">
                  <Badge
                    asChild
                    rounded
                    id={id}
                    variant="outline"
                    size={breakpoint === 'xl' ? 'lg' : 'md'}
                    className={cn(
                      {
                        'w-12 !justify-center !px-0': !allowText && breakpoint === 'xl',
                      },
                      {
                        '!w-10 !justify-center !px-0': breakpoint === 'l' && !allowText,
                      },
                      'group relative flex items-center justify-center',
                      '!overflow-visible !py-0 bg-white select-none hover:shadow-sm hover:bg-background',
                      { 'bg-primary-9 text-white': isActiveHelp },
                      {
                        'group-hover:rounded-r-none': hasAction,
                      },
                      'transition-all duration-400 ease-out',
                      clx
                    )}
                  >
                    <Link prefetch href={url} transitionTypes={getTransitionTypes(index)}>
                      {allowText && <span className="group-hover:text-primary-3">{title}</span>}
                      {icon}
                    </Link>
                  </Badge>
                  <span className="text-primary-9 absolute top-full left-1/2 -translate-x-1/2 text-sm whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Help
                  </span>
                </div>
              </div>
            );
          }

          const isActiveLink = activeSection === baseUrl || isActive?.(pathname);
          return (
            <div key={key} className="group flex w-max items-center justify-center gap-0">
              <div className="relative flex items-center">
                <Badge
                  asChild
                  rounded
                  id={id}
                  variant="outline"
                  size={breakpoint === 'xl' ? 'lg' : 'md'}
                  className={cn(
                    {
                      'w-12 !justify-center !px-0': !allowText && breakpoint === 'xl',
                    },
                    {
                      '!w-10 !justify-center !px-0': breakpoint === 'l' && !allowText,
                    },
                    'group relative flex items-center justify-center',
                    '!overflow-visible !py-0 bg-white select-none hover:shadow-sm hover:bg-background',
                    { 'bg-primary-9 text-white': isActiveLink },
                    {
                      'group-hover:rounded-r-none': hasAction,
                    },
                    'transition-all duration-400 ease-out',
                    clx
                  )}
                >
                  <Link prefetch href={url} transitionTypes={getTransitionTypes(index)}>
                    {allowText && <span className="group-hover:text-primary-3">{title}</span>}
                    {icon}
                  </Link>
                </Badge>
              </div>
            </div>
          );
        }
      )}
      {isFeedbackModalOpen && (
        <FeedbackModal open={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} />
      )}
    </>
  );
}
