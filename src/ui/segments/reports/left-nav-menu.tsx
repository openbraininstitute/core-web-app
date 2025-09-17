'use client';

import { RightOutlined } from '@ant-design/icons';
import filter from 'lodash/filter';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ComponentProps } from 'react';

import { ROOT_ROUTE } from '@/config';
import { useUserRole } from '@/hooks/use-user-role';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';
import { getActiveSection } from '@/utils/get-section';

type Props = {
  className?: ComponentProps<'div'>['className'];
};

const links = [
  {
    key: 'showcases',
    title: 'Showcases',
    url: 'showcases',
    requireRole: false,
  },
  {
    key: 'summaries',
    title: 'Summaries',
    url: 'summaries',
    requireRole: false,
  },
  {
    key: 'obi-showcases',
    title: 'OBI Showcases',
    url: 'obi-showcases',
    requireRole: false,
  },
];

export function LeftMenu({ className }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  const { isProjectAdmin } = useUserRole({ virtualLabId, projectId });
  const pathname = usePathname();
  const activeSection = getActiveSection(pathname);

  const hashedLinks = filter(
    links.map((link) => ({
      ...link,
      baseUrl: link.url,
      url: `${ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks/${link.url}`,
    })),
    (link) => !link.requireRole || (link.requireRole && isProjectAdmin)
  );

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex w-full flex-col items-center justify-center gap-2">
        {hashedLinks.map(({ title, key, baseUrl }) => (
          <Button
            rounded
            borderless
            asChild
            key={key}
            variant="outline"
            className="h-auto w-full justify-start font-bold shadow-sm"
            size={breakpoint === 'xl' ? 'lg' : 'md'}
            aria-label={activeSection === baseUrl ? 'active' : ''}
            active={activeSection === baseUrl}
          >
            <Link href={`${pathname}?section=${baseUrl}`}>
              {title}
              <RightOutlined className="ml-auto text-current" />
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

export default LeftMenu;
