'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { unwrap } from 'jotai/utils';
import { useAtomValue } from 'jotai';

import VerticalLinks from '@/components/VerticalLinks';
import { virtualLabStatsAtomFamily } from '@/state/virtual-lab/lab';
import { LinkItemKey } from '@/constants/virtual-labs/sidemenu';
import { type LinkItemWithRequirements } from '@/types/virtual-lab/navigation';

export default function VirtualLabSidebarContent({ virtualLabId }: { virtualLabId: string }) {
  const { data: session } = useSession();
  const currentPage = usePathname().split('/').pop();
  const virtualLabStats = useAtomValue(
    useMemo(() => unwrap(virtualLabStatsAtomFamily(virtualLabId)), [virtualLabId])
  );

  const isAdmin = session?.user.id
    ? virtualLabStats?.data?.admin_users.includes(session?.user.id)
    : false;
  const totalMembers = virtualLabStats?.data?.total_members;
  const totalProjects = virtualLabStats?.data?.total_projects;
  const linkItemFilter = (link: LinkItemWithRequirements) =>
    link.requires?.userRole === 'admin' ? isAdmin : true;
  const linkItems: LinkItemWithRequirements[] = [
    { key: LinkItemKey.Lab, content: 'Virtual lab overview', href: 'overview' },
    {
      key: LinkItemKey.Projects,
      content: (
        <div className="flex justify-between">
          <span>Projects</span>
          {Boolean(totalProjects) && (
            <span className="text-primary-3 font-normal">{totalProjects}</span>
          )}
        </div>
      ),
      href: 'projects',
    },
    {
      key: LinkItemKey.Team,
      content: (
        <div className="flex justify-between">
          <span>Team</span>
          {Boolean(totalMembers) && (
            <span className="text-primary-3 font-normal">{`${totalMembers} member${totalMembers !== 1 ? 's' : ''}`}</span>
          )}
        </div>
      ),
      href: 'team',
    },
    { key: LinkItemKey.Admin, content: 'Admin', href: 'admin', requires: { userRole: 'admin' } },
  ];
  const compliantLinkItems = linkItems.filter(linkItemFilter);
  return (
    <div className="mr-5 flex w-full flex-col gap-5">
      <VerticalLinks links={compliantLinkItems} currentPage={currentPage} />
    </div>
  );
}
