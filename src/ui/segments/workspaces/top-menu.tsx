'use client';

import { usePathname } from 'next/navigation';
import { ComponentProps, ReactNode } from 'react';
import Link from 'next/link';

import {
  ExploreIcon,
  HelpIcon,
  NotebookIcon,
  WorkflowIcon,
  Home,
} from '@/components/icons/buttons';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { SpaceSwitcher } from '@/ui/segments/workspaces/space-switcher';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Wallet } from '@/ui/segments/project/balance';
import { getActiveSection } from '@/utils/get-section';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

type Props = {
  className?: ComponentProps<'div'>['className'];
};

type LinkItem = {
  id: string;
  key: string;
  title: string;
  url: string;
  icon: ReactNode;
  allowText: boolean;
  className: React.ComponentProps<'div'>['className'];
  isActive?: (path: string) => boolean;
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
  },
  {
    id: 'workspace-explore-data',
    key: 'explore',
    title: 'Explore',
    url: 'explore',
    icon: <ExploreIcon className="group-hover:text-primary-3 text-xl" />,
    allowText: true,
    className: 'px-6 gap-8',
  },
  {
    id: 'workspace-workflows',
    key: 'workflows',
    title: 'Workflows',
    url: 'workflows',
    icon: <WorkflowIcon className="group-hover:text-primary-3 text-xl" />,
    allowText: true,
    className: 'px-6 gap-8',
  },

  {
    id: 'workspace-notebooks',
    key: 'notebooks',
    title: 'Notebooks',
    url: 'notebooks',
    icon: <NotebookIcon className="group-hover:text-primary-3 h-5!" />,
    allowText: true,
    className: 'px-6 gap-8',
  },
  {
    id: 'workspace-help',
    key: 'help',
    title: 'Help',
    url: 'help',
    icon: <HelpIcon className="group-hover:text-primary-3 text-lg" />,
    allowText: true,
    className: '',
  },
];

export function WorkspaceTopMenu({ className }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();

  const pathname = usePathname();
  const activeSection = getActiveSection(pathname);

  const hashedLinks = links.map((link) => ({
    ...link,
    baseUrl: link.url,
    url: `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/${link.url}`,
  }));

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex items-start justify-center gap-2">
        <SpaceSwitcher className="w-[calc(24rem-1.5rem)]" />
        <Wallet />
      </div>
      <div className="flex items-center justify-center gap-2">
        {hashedLinks.map(
          ({ id, key, title, url, baseUrl, icon, allowText, className: clx, isActive }) => (
            <Button
              asChild
              rounded
              id={id}
              key={key}
              variant="outline"
              size={breakpoint === 'xl' ? 'lg' : 'md'}
              className={cn(
                { 'w-12! justify-center!': !allowText },
                'group flex items-center justify-between',
                clx
              )}
              active={activeSection === baseUrl || isActive?.(pathname)}
            >
              <Link href={url}>
                {allowText && <span>{title}</span>}
                {icon}
              </Link>
            </Button>
          )
        )}
      </div>
    </div>
  );
}

export default WorkspaceTopMenu;
