'use client';

import { usePathname } from 'next/navigation';
import { useAtomValue } from 'jotai';
import Image from 'next/image';
import { useMemo } from 'react';

import Link from 'next/link';
import kebabCase from 'es-toolkit/compat/kebabCase';

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
        <div className="border-primary-5 mt-20 border">
          {menu.map(({ url, title, count }) => (
            <Item
              data-testid={kebabCase(title as string)}
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
          data-testid="public-explore"
          href="/app/virtual-lab/explore/interactive"
          className="bg-primary-8 relative mt-4 h-44 overflow-hidden rounded-md px-4 py-2 opacity-90 hover:opacity-100"
        >
          <Image
            loading="lazy"
            src="/images/multiple-brains.webp"
            alt="Explore public resources"
            width={294}
            height={294}
            className="absolute -right-[80px] -bottom-[80px] z-0"
          />
          <div className="bg-primary-8/50 absolute inset-0 z-10 h-full w-full rounded-md" />
          <div className="relative z-20 h-full">
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
