'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { classNames } from '@/util/utils';
import Item from '@/components/VirtualLab/side-bar/item';
import Profile from '@/components/VirtualLab/side-bar/profile';
import LogoAsLink from '@/components/logo/as-link';

const menuItems = [
  {
    url: '/app/virtual-lab',
    title: 'Virtual labs',
  },
  {
    url: '/app/virtual-lab/subscription',
    title: 'Subscription',
  },
];

export default function SideBar() {
  const path = usePathname();

  return (
    <aside
      className={classNames(
        'flex h-full flex-grow flex-col text-white',
        'w-72 transition-all duration-300 ease-in-out'
      )}
    >
      <LogoAsLink />
      <nav className="flex max-h-max flex-1 flex-col py-4">
        <div className="mt-20 border border-primary-5">
          {menuItems.map(({ url, title }) => (
            <Item key={url} url={url} title={title} active={path === url} />
          ))}
        </div>
        <Link
          href="/app/virtual-lab/explore/interactive"
          className="relative mt-4 h-44 rounded-md bg-primary-8 px-4 py-2 opacity-90 hover:opacity-100"
          style={{
            background: `url(/images/multiple-brains.png) #003A8C no-repeat bottom -122px right -108px`,
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
      <Profile />
    </aside>
  );
}
