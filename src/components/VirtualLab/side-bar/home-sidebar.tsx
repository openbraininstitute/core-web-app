'use client';

import { useAtomValue } from 'jotai';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import Base from '@/components/VirtualLab/side-bar/base';
import Item, { Props as ItemProps } from '@/components/VirtualLab/side-bar/item';
import { userStatsAtom } from '@/state/virtual-lab/lab';

export default function SideBar() {
  const path = usePathname();
  const userStats = useAtomValue(userStatsAtom);
  const labsCount = userStats?.data?.total_labs;

  const menu: Array<ItemProps> = useMemo(
    () => [
      {
        url: '/app/virtual-lab',
        title: 'Virtual labs',
        count: labsCount,
      },
      {
        url: '/app/virtual-lab/public-projects',
        title: 'Public projects',
        count: 3,
      },
    ],
    [labsCount]
  );

  return (
    <Base>
      <nav className="flex max-h-max flex-1 flex-col py-4">
        <div className="mt-20 border border-primary-5">
          {menu.map(({ url, title, count }) => (
            <Item
              key={url}
              url={url}
              title={title}
              active={path === url}
              disabled={false}
              count={count}
            />
          ))}
        </div>
        <Link
          href="/app/virtual-lab/explore/interactive"
          className="relative mt-4 h-44 rounded-md bg-primary-8 px-4 py-2 opacity-90 hover:opacity-100"
          style={{
            background: `url(/images/multiple-brains.webp) #003A8C no-repeat bottom -122px right -108px`,
            backgroundSize: '294px 294px',
          }}
        >
          <div className="absolute inset-0 h-full w-full rounded-md bg-primary-8/50" />
          <div className="relative h-full">
            <div className="flex h-full flex-col justify-between p-4">
              <h3 className="mb-2 text-xl font-bold">Explore</h3>
              <div className="mt-auto">Browse resources</div>
            </div>
          </div>
        </Link>
      </nav>
    </Base>
  );
}
