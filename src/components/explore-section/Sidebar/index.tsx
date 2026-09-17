import { ArrowRightOutlined } from '@ant-design/icons';
import { atom, useAtomValue } from 'jotai';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import ApplicationSidebar, {
  NavigationItem,
  type NavigationItemProps,
} from '@/components/ApplicationSidebar';
import Link from '@/components/Link';
import { MainNavigation } from '@/components/main';
import { classNames } from '@/util/utils';

const EXPLORE_NAVIGATION_LIST: Array<NavigationItemProps> = [
  {
    name: 'Interactive exploration',
    description:
      'Explore each brain region and discover all the experimental data, virtual experiments targeting these regions and the literature associated to those.',
    url: '/app/explore/interactive',
    bgcolor: 'bg-primary-5',
  },
  {
    name: 'Knowledge discovery',
    description: 'Explore the literature and query publications using a chatbot.',
    url: '/app/explore/literature',
    bgcolor: 'bg-primary-6',
  },
];
export const backToListPathAtom = atom<string | null | undefined>(null);
export const brainRegionSidebarIsCollapsedAtom = atom(true);

export function DetailsPageSideBackLink() {
  const pathName = usePathname();
  const backToListPath = useAtomValue(backToListPathAtom); // this uses the previous path atom for the back to list
  const activePrevPath = backToListPath || pathName?.substring(0, pathName.lastIndexOf('/')); // this condition checks if the back to list path atom is set, if not use default

  const isSimulation = pathName?.includes('/simulations/');
  const prevPath = isSimulation
    ? pathName?.substring(0, pathName.lastIndexOf('/simulations/'))
    : activePrevPath;

  return prevPath ? (
    <Link
      className="bg-neutral-1 text-primary-8 fixed flex h-full w-[40px] flex-col items-center pt-2 text-sm"
      href={prevPath}
    >
      <ArrowRightOutlined className="mt-1.5 mb-4 rotate-180" />
      <div style={{ writingMode: 'vertical-rl', rotate: '180deg' }}>Back to list</div>
    </Link>
  ) : null;
}

function ExploreNavigation({ expanded }: { expanded: boolean }) {
  return (
    <ul
      className={classNames(
        'primary-scrollbar flex h-full w-full flex-col items-start justify-start gap-y-1 overflow-y-auto',
        !expanded && 'hidden'
      )}
    >
      {EXPLORE_NAVIGATION_LIST.map(({ name, url, description, bgcolor }) => (
        <NavigationItem key={url} {...{ name, url, description, bgcolor }} />
      ))}
    </ul>
  );
}

function ExploreSideBarHeader() {
  return <div className="flex items-center justify-center select-none">Explore</div>;
}

export default function ExploreSidebar() {
  const { status } = useSession();
  const Control = status === 'unauthenticated' ? MainNavigation : ExploreNavigation;

  return (
    <ApplicationSidebar title={ExploreSideBarHeader}>
      {({ expanded }) => <Control {...{ expanded }} />}
    </ApplicationSidebar>
  );
}
