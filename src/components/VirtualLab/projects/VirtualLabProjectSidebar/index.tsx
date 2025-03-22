'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';

import VerticalLinks from '@/components/VerticalLinks';
import { LinkItemWithRequirements } from '@/types/virtual-lab/navigation';
import { fetchNotebookCount } from '@/util/virtual-lab/fetchNotebooks';
import { projectStatsAtomFamily } from '@/state/virtual-lab/projects';
import { LinkItemKey } from '@/constants/virtual-labs/sidemenu';
import { notebookRepoUrl } from '@/config';
import { tryCatch } from '@/api/utils';

type Props = {
  virtualLabId: string;
  projectId: string;
};

export default function VirtualLabProjectSidebar({ virtualLabId, projectId }: Props) {
  const { data: session } = useSession();
  const url = usePathname().split('/');
  const currentPage = url[url.length - 1] !== 'new' ? url[url.length - 1] : url[url.length - 2];
  const [globalNotebookCount, setGlobalNotebookCount] = useState<number>(0);
  const projectStats = useAtomValue(
    useMemo(
      () => unwrap(projectStatsAtomFamily({ virtualLabId, projectId })),
      [virtualLabId, projectId]
    )
  );

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const { data, error } = await tryCatch(fetchNotebookCount(notebookRepoUrl));
      if (isMounted && data) setGlobalNotebookCount(data ?? 0);
      if (error) setGlobalNotebookCount(0);
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = projectStats?.data;
  const isAdmin = session?.user.id ? stats?.admin_users.includes(session.user.id) : false;
  const linkItems: Array<LinkItemWithRequirements> = useMemo(() => {
    const bookmarksCount = stats?.total_bookmarks;
    const membersCount = stats?.total_members;
    const notebookCount = (stats?.total_notebooks ?? 0) + globalNotebookCount;

    return [
      { key: LinkItemKey.Home, content: 'Project Home', href: 'home' },
      {
        key: LinkItemKey.Library,
        content: (
          <div className="flex justify-between">
            <span>Project Library</span>
            {bookmarksCount ? (
              <span className="font-normal text-primary-3">{bookmarksCount}</span>
            ) : null}
          </div>
        ),
        href: 'library',
      },
      {
        key: LinkItemKey.Team,
        content: (
          <div className="flex justify-between">
            <span>Project Team</span>
            {membersCount ? (
              <span className="font-normal text-primary-3">{membersCount}</span>
            ) : null}
          </div>
        ),
        href: 'team',
      },
      {
        key: LinkItemKey.Activity,
        content: 'Activity',
        href: 'activity',
      },
      {
        key: 'notebooks',
        content: (
          <div className="flex justify-between">
            <span>Notebooks</span>
            {notebookCount > 0 ? (
              <span className="font-normal text-primary-3">{notebookCount}</span>
            ) : null}
          </div>
        ),
        href: 'notebooks',
      },
      { key: LinkItemKey.Explore, content: 'Explore', href: 'explore/interactive' },
      { key: LinkItemKey.Build, content: 'Build', href: 'build' },
      { key: LinkItemKey.Simulate, content: 'Simulate', href: 'simulate' },
      {
        key: LinkItemKey.Papers,
        disabled: true,
        content: (
          <div className="flex justify-between">
            <span className="opacity-50">Project papers</span>
            <span className="font-normal text-primary-3">Coming soon</span>
          </div>
        ),
        href: 'papers',
      },
      {
        key: LinkItemKey.Admin,
        content: 'Admin',
        href: 'admin',
        requires: { userRole: 'admin' },
      },
    ];
  }, [stats, globalNotebookCount]);

  const compliantLinkItems = useMemo(() => {
    const linkItemFilter = (link: LinkItemWithRequirements) =>
      link.requires?.userRole === 'admin' ? isAdmin : true;
    return linkItems.filter(linkItemFilter);
  }, [linkItems, isAdmin]);

  return (
    <div className="my-8 mr-6 flex w-full flex-col gap-5">
      <VerticalLinks
        virtualLabId={virtualLabId}
        projectId={projectId}
        currentPage={currentPage}
        links={compliantLinkItems}
      />
    </div>
  );
}
