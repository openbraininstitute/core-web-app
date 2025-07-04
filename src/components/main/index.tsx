'use client';

import ApplicationSidebar, {
  DefaultAccountPanel,
  NavigationItem,
  NavigationItemProps,
} from '../ApplicationSidebar';
import ObiLogoSvg from '@/components/logo/as-svg';
import { basePath } from '@/config';
import { classNames } from '@/util/utils';

function MainSidebarHeader({ expanded }: { expanded: boolean }) {
  return expanded ? <span>BBOP</span> : <span>Menu</span>;
}

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

function Main() {
  return (
    <div className={classNames('bg-primary-9 relative h-full')}>
      <div
        className="bg-primary-9 fixed inset-0 z-0 h-full min-h-screen w-full [background-size:70%] bg-center bg-no-repeat bg-blend-lighten"
        style={{
          backgroundImage: `url(${basePath}/images/obp_fullbrain_backdroped.png)`,
        }}
      />
      <div className="fixed left-0 z-20">
        <ApplicationSidebar title={MainSidebarHeader}>
          {({ expanded }) => <MainNavigation {...{ expanded }} />}
        </ApplicationSidebar>
      </div>

      <div className="grid h-screen grid-cols-[1fr_3fr] justify-end gap-x-2 py-5 pr-7 pl-14">
        <div className="flex w-full flex-col gap-y-7">
          <ObiLogoSvg className="z-10 text-white" />
          <div className="w-90percent z-10">
            <DefaultAccountPanel expanded />
          </div>
        </div>
      </div>
    </div>
  );
}
