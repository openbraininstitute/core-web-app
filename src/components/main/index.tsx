'use client';

import { NavigationItem, NavigationItemProps } from '../ApplicationSidebar';
import { classNames } from '@/util/utils';

const MAIN_NAVIGATION_LIST: Array<NavigationItemProps> = [
  {
    name: 'About',
    description: 'Explore the literature and query publications using a chatbot.',
    url: '/about',
    bgcolor: 'bg-primary-6',
  },
];

export function MainNavigation({ expanded }: { expanded: boolean }) {
  return (
    <ul
      className={classNames(
        'primary-scrollbar flex h-full w-full flex-col items-start justify-start gap-y-1 overflow-y-auto',
        !expanded && 'hidden'
      )}
    >
      {MAIN_NAVIGATION_LIST.map(({ name, url, description, bgcolor }) => (
        <NavigationItem key={url} {...{ name, url, description, bgcolor }} />
      ))}
    </ul>
  );
}
