'use client';

import { usePathname } from 'next/navigation';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

import { useEffect, useMemo, useState } from 'react';
import { LinkItemKey } from '@/constants/virtual-labs/sidemenu';
import VerticalLinks from '@/components/VerticalLinks';
import {
  virtualLabProjectPapersCountAtomFamily,
  virtualLabProjectUsersAtomFamily,
} from '@/state/virtual-lab/projects';
import { bookmarksForProjectAtomFamily } from '@/state/virtual-lab/bookmark';
import { getBookmarksCount } from '@/services/virtual-lab/bookmark';
import { useLoadableValue } from '@/hooks/hooks';
import { useIsProjectAdmin } from '@/hooks/virtual-labs';
import { LinkItemWithRequirements } from '@/types/virtual-lab/navigation';
import { fetchNotebookCount } from '@/util/virtual-lab/fetchNotebooks';
import { notebookRepoUrl, virtualLabApi } from '@/config';
import authFetch from '@/authFetch';

type Props = {
  virtualLabId: string;
  projectId: string;
};

export default function VirtualLabProjectSidebar({ virtualLabId, projectId }: Props) {
  const url = usePathname().split('/');
  const currentPage = url[url.length - 1] !== 'new' ? url[url.length - 1] : url[url.length - 2];

  const [notebookCount, setNotebookCount] = useState<number | null>(null);
  const [userNotebookCount, setUserNotebookCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const count = await fetchNotebookCount(notebookRepoUrl);
        const res = await authFetch(
          `${virtualLabApi.url}/projects/${projectId}/notebooks/?page_size=1  `
        );
        let userCount: number;

        if (res.ok) {
          userCount = (await res.json()).data.total;
          setUserNotebookCount(userCount);
        }

        setNotebookCount(count);
      } catch (e) {
        console.error(e); // eslint-disable-line no-console
      }
    }
    fetch();
  }, [projectId]);

  const projectUsers = useLoadableValue(
    virtualLabProjectUsersAtomFamily({ virtualLabId, projectId })
  );
  const bookmarks = useLoadableValue(bookmarksForProjectAtomFamily({ virtualLabId, projectId }));
  const projectPapers = useLoadableValue(
    virtualLabProjectPapersCountAtomFamily({ virtualLabId, projectId })
  );

  const isAdmin = useIsProjectAdmin({ virtualLabId, projectId });

  const linkItemFilter = (link: LinkItemWithRequirements) =>
    link.requires?.userRole === 'admin' ? isAdmin : true;

  const renderUserAmount = () => {
    if (projectUsers.state === 'loading') {
      return <Spin indicator={<LoadingOutlined />} />;
    }
    if (projectUsers.state === 'hasData') {
      const count = projectUsers.data?.length;
      return `${count} member${count && count > 1 ? 's' : ''}`;
    }
    return null;
  };

  // Use this function once Project Papers is implemented
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderPapersAmount = () => {
    if (projectPapers.state === 'loading') {
      return <Spin indicator={<LoadingOutlined />} />;
    }
    if (projectPapers.state === 'hasData') {
      const count = projectPapers.data;
      return `${count} paper${count && count > 1 ? 's' : ''}`;
    }
    return null;
  };

  const bookmarksCount = useMemo(() => {
    if (bookmarks.state === 'loading') {
      return <Spin indicator={<LoadingOutlined />} />;
    }
    if (bookmarks.state === 'hasData') {
      return getBookmarksCount(bookmarks.data);
    }
    return null;
  }, [bookmarks]);

  const linkItems: LinkItemWithRequirements[] = [
    { key: LinkItemKey.Home, content: 'Project Home', href: 'home' },
    {
      key: LinkItemKey.Library,
      content: (
        <div className="flex justify-between">
          <span>Project Library</span>
          <span className="font-normal text-primary-3">{bookmarksCount}</span>
        </div>
      ),
      href: 'library',
    },
    {
      key: LinkItemKey.Team,
      content: (
        <div className="flex justify-between">
          <span>Project Team</span>
          <span className="font-normal text-primary-3">{renderUserAmount()}</span>
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
          {notebookCount !== null && userNotebookCount !== null && (
            <span className="font-normal text-primary-3">{notebookCount + userNotebookCount}</span>
          )}
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

  const compliantLinkItems = linkItems.filter(linkItemFilter);

  return (
    <div className="my-8 mr-6 flex w-full flex-col gap-5">
      <VerticalLinks
        {...{
          virtualLabId,
          projectId,
          currentPage,
          links: compliantLinkItems,
        }}
      />
    </div>
  );
}
