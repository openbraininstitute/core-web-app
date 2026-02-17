import { MenuOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

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
import { URL_PARAMS } from '@/features/brain-region-hierarchy/context';
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
import { cleanSearchParams } from '@/utils/search-params';

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
  {
    id: 'workspace-feedbacks',
    key: 'feedbacks',
    title: 'Feedback',
    url: 'feedback',
    icon: <FeedbackStarIcon className="group-hover:text-primary-3 relative left-0.5 h-6! w-6!" />,
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
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

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
                        <Link
                          href={{
                            pathname: link.url,
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
        {isFeedbackModalOpen && (
          <FeedbackModal open={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} />
        )}
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
            keepKeys: [URL_PARAMS.BRAIN_REGION_ID, URL_PARAMS.HIERARCHY_ID],
          }).toString();

          if (id === 'workspace-feedbacks') {
            return (
              <div key={key} className="group flex w-max items-center justify-center gap-0">
                <div className="relative flex items-center">
                  <Button
                    rounded
                    id={id}
                    variant="outline"
                    size={breakpoint === 'xl' ? 'lg' : 'md'}
                    className={cn(
                      {
                        'w-12 justify-center!': !allowText && breakpoint === 'xl',
                      },
                      {
                        'w-10! justify-center!': breakpoint === 'l' && !allowText,
                      },
                      'group relative flex items-center justify-between',
                      'transition-all duration-400 ease-out',
                      clx
                    )}
                    active={activeSection === baseUrl || isActive?.(pathname)}
                    onClick={() => setIsFeedbackModalOpen(true)}
                  >
                    {allowText && <span>{title}</span>}
                    {icon}
                  </Button>
                  <span className="text-primary-9 absolute top-full right-0 text-sm whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Feedback
                  </span>
                </div>
              </div>
            );
          }

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
                      {
                        'w-12 justify-center!': !allowText && breakpoint === 'xl',
                      },
                      {
                        'w-10! justify-center!': breakpoint === 'l' && !allowText,
                      },
                      'group relative flex items-center justify-between',
                      {
                        'group-hover:rounded-r-none group-hover:border-r-0': hasAction,
                      },
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
                    {
                      'w-12 justify-center!': !allowText && breakpoint === 'xl',
                    },
                    {
                      'w-10! justify-center!': breakpoint === 'l' && !allowText,
                    },
                    'group relative flex items-center justify-between',
                    {
                      'group-hover:rounded-r-none group-hover:border-r-0': hasAction,
                    },
                    'transition-all duration-400 ease-out',
                    clx
                  )}
                  active={activeSection === baseUrl || isActive?.(pathname)}
                >
                  <Link
                    prefetch
                    href={{
                      pathname: url,
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
      {isFeedbackModalOpen && (
        <FeedbackModal open={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} />
      )}
    </>
  );
}
