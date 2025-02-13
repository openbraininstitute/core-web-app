'use client';

import { usePathname } from 'next/navigation';

import { virtualLabMembersAtomFamily } from '@/state/virtual-lab/lab';
import { virtualLabProjectsAtomFamily } from '@/state/virtual-lab/projects';
import VerticalLinks from '@/components/VerticalLinks';
import { type LinkItemWithRequirements } from '@/types/virtual-lab/navigation';
import { LinkItemKey } from '@/constants/virtual-labs/sidemenu';
import { useUnwrappedValue } from '@/hooks/hooks';
import { useIsVirtualLabAdmin } from '@/hooks/virtual-labs';

export default function VirtualLabSidebarContent({ virtualLabId }: { virtualLabId: string }) {
  const currentPage = usePathname().split('/').pop();
  const projects = useUnwrappedValue(virtualLabProjectsAtomFamily(virtualLabId));
  const users = useUnwrappedValue(virtualLabMembersAtomFamily(virtualLabId))?.length;

  const isAdmin = useIsVirtualLabAdmin({ virtualLabId });

  const linkItemFilter = (link: LinkItemWithRequirements) =>
    link.requires?.userRole === 'admin' ? isAdmin : true;

  const linkItems: LinkItemWithRequirements[] = [
    { key: LinkItemKey.Lab, content: 'Virtual lab overview', href: 'overview' },
    {
      key: LinkItemKey.Projects,
      content: (
        <div className="flex justify-between">
          <span>Projects</span>
          <span className="font-normal text-primary-3">{projects?.results.length}</span>
        </div>
      ),
      href: 'projects',
    },
    {
      key: LinkItemKey.Team,
      content: (
        <div className="flex justify-between">
          <span>Team</span>
          {users !== undefined && (
            <span className="font-normal text-primary-3">{`${users} member${users !== 1 ? 's' : ''}`}</span>
          )}
        </div>
      ),
      href: 'team',
    },
    { key: LinkItemKey.Admin, content: 'Admin', href: 'admin', requires: { userRole: 'admin' } },
  ];

  const complientLinkItems = linkItems.filter(linkItemFilter);

  return (
    <div className="mr-5 flex w-full flex-col gap-5">
      <VerticalLinks links={complientLinkItems} currentPage={currentPage} />
    </div>
  );
}
