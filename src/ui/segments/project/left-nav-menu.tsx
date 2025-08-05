import { RightOutlined } from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import { ComponentProps } from 'react';
import filter from 'lodash/filter';
import Link from 'next/link';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { getActiveSection } from '@/utils/get-section';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { useUserRole } from '@/hooks/use-user-role';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

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
  //   {
  //     key: 'Showcases',
  //     title: 'Showcases',
  //     url: 'showcases',
  //   },
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
      url: `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/${link.url}`,
    })),
    (link) => !link.requireRole || (link.requireRole && isProjectAdmin)
  );

  return (
    <div className={cn('flex gap-2', className)}>
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
    </div>
  );
}

export default LeftMenu;
