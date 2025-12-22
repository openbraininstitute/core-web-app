'use client';

import { RightOutlined } from '@ant-design/icons';
import filter from 'es-toolkit/compat/filter';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';
import { config } from '@/config';
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
    key: 'overview',
    title: 'Overview',
    url: '',
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
  const { isVirtualLabAdmin: isAdmin } = useUserRole({
    virtualLabId,
    projectId,
  });
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
      <div className="flex w-full flex-col items-center justify-center gap-2">
        {hashedLinks.map(({ title, key, url, baseUrl }) => (
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
            <Link href={url}>
              {title}
              <RightOutlined className="ml-auto text-current" />
            </Link>
          </Button>
        ))}
      </div>
      {/* <Metrics
        {...{
          virtualLabId,
          projectId,
          cls: {
            container: 'mt-10',
            label: 'text-neutral-4',
            value: 'text-primary-9 font-bold',
            body: 'flex flex-col w-full gap-2',
          },
          loadingComponent: (
            <MetricsSkeleton cls={{ body: 'flex flex-col gap-2', container: 'mt-10' }} />
          ),
        }}
      /> */}
    </div>
  );
}

export default LeftMenu;
