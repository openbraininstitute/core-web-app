'use client';

import { HomeFilled } from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import { ComponentProps } from 'react';
import Link from 'next/link';

import { ExploreIcon, HelpIcon, NotebookIcon, WorkflowIcon } from '@/components/icons/buttons';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { LabDropdown } from '@/ui/segments/workspaces-menu';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Wallet } from '@/ui/segments/project/balance';
import { getActiveSection } from '@/utils/get-section';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

type Props = {
  className?: ComponentProps<'div'>['className'];
};

const links = [
  {
    key: 'home',
    title: 'Home',
    url: '',
    icon: <HomeFilled className="text-lg group-hover:text-white" />,
    allowText: false,
    className: 'gap-2',
  },
  {
    key: 'explore',
    title: 'Explore',
    url: 'explore',
    icon: <ExploreIcon className="group-hover:text-primary-3 text-lg" />,
    allowText: true,
    className: 'px-6 gap-8',
  },
  {
    key: 'workflows',
    title: 'Workflows',
    url: 'workflows',
    icon: <WorkflowIcon className="group-hover:text-primary-3 text-lg" />,
    allowText: true,
    className: 'px-6 gap-8',
  },

  {
    key: 'notebooks',
    title: 'Notebooks',
    url: 'notebooks',
    icon: <NotebookIcon className="group-hover:text-primary-3 text-lg" />,
    allowText: true,
    className: 'px-6 gap-8',
  },
  {
    key: 'help',
    title: 'Help',
    url: 'help',
    icon: <HelpIcon className="group-hover:text-primary-7 text-lg" />,
    allowText: true,
    className: '',
  },
];

export function WorkspaceTopMenu({ className }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();

  const pathname = usePathname();
  const activeSection = getActiveSection(pathname);

  console.log('–– – project-top-menu.tsx:73 – WorkspaceTopMenu – activeSection:', activeSection);

  const hashedLinks = links.map((link) => ({
    ...link,
    baseUrl: link.url,
    url: `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/${link.url}`,
  }));

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex items-start justify-center gap-2">
        <LabDropdown className="w-[calc(24rem-1.5rem)]" />
        <Wallet />
      </div>
      <div className="flex items-center justify-center gap-2">
        {hashedLinks.map(({ key, title, url, baseUrl, icon, allowText, className: clx }) => (
          <Button
            asChild
            rounded
            key={key}
            variant="outline"
            size={breakpoint === 'xl' ? 'lg' : 'md'}
            className={cn(
              { 'w-10! justify-center!': !allowText },
              'group flex items-center justify-between',
              clx
            )}
            active={activeSection === baseUrl}
          >
            <Link href={url}>
              {allowText && <span>{title}</span>}
              {icon}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

export default WorkspaceTopMenu;
