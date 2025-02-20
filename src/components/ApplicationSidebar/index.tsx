import { Suspense, useRef } from 'react';
import { Button } from 'antd';
import Link from 'next/link';
import kebabCase from 'lodash/kebabCase';
import Icon, { ArrowRightOutlined, UserOutlined, HomeOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';

import { classNames, signOut } from '@/util/utils';
import useOnClickOutside from '@/hooks/useOnClickOutside';

type TDefaulNavigation = {
  title: string;
  url: string;
  icon: React.ForwardRefExoticComponent<any>;
  showIconOnCollapse?: boolean;
  bgcolor?: string;
};

type ApplicationSidebarHeaderProps = {
  title: ({ expanded }: { expanded: boolean }) => React.ReactNode;
  expanded: boolean;
  toggleExpand: () => void;
};

type P = { expanded: boolean };
type ApplicationSidebarProps = {
  title: ({ expanded }: P) => React.ReactNode;
  account?: (({ expanded }: P) => React.ReactNode) | null;
  navigation?: (({ expanded }: P) => React.ReactNode) | null;
  children?: ({ expanded }: P) => React.ReactNode;
};

export type NavigationItemProps = {
  name: string;
  description: string;
  url: string;
  bgcolor: string;
};

const DEFAULT_NAVIGATION: Array<TDefaulNavigation> = [
  {
    title: 'Home',
    url: '/app/virtual-lab',
    icon: HomeOutlined,
    showIconOnCollapse: true,
  },
  {
    url: '/app/explore/interactive',
    title: 'Explore',
    icon: ArrowRightOutlined,
    bgcolor: 'bg-primary-8',
  },
  {
    url: '/app/main?tab=build',
    title: 'Build',
    icon: ArrowRightOutlined,
    bgcolor: 'bg-primary-8',
  },
  {
    url: '/app/main?tab=simulate',
    title: 'Simulate',
    icon: ArrowRightOutlined,
    bgcolor: 'bg-primary-8',
  },
];

export function NavigationItem({ url, name, description, bgcolor }: NavigationItemProps) {
  return (
    <li
      key={url}
      className={classNames(
        'relative mx-auto flex w-full cursor-pointer p-4 hover:bg-primary-7',
        bgcolor
      )}
    >
      <Link href={url} className="mx-auto w-full">
        <h1 className="text-xl font-bold text-white">{name}</h1>
        <p
          title={description}
          className="mt-1 line-clamp-1 select-none text-left text-sm font-thin text-primary-4"
        >
          {description}
        </p>
      </Link>
    </li>
  );
}

export function AppNavigationItem({
  expanded,
  title,
  bgcolor,
  url,
  icon,
  showIconOnCollapse,
}: TDefaulNavigation & { expanded: boolean }) {
  if (!expanded && showIconOnCollapse) {
    return (
      <Link href={url}>
        <Icon component={icon} title={title} className="my-2 text-primary-4" />
      </Link>
    );
  }
  return (
    <Link
      href={url}
      className={classNames(
        'inline-flex w-full flex-row items-center justify-between px-3 py-3 hover:bg-primary-7',
        bgcolor ?? 'bg-transparent',
        !expanded && 'hidden'
      )}
    >
      <div className="text-base font-semibold text-white">{title}</div>
      <Icon component={icon} title={title} className="cursor-pointer text-white" />
    </Link>
  );
}

export function AppNavigation({ expanded }: { expanded: boolean }) {
  return (
    <div
      className={classNames(
        'my-2 flex w-full flex-col gap-y-1',
        expanded ? 'items-start' : 'items-center'
      )}
    >
      {DEFAULT_NAVIGATION.map(({ title, url, icon, bgcolor, showIconOnCollapse }) => (
        <AppNavigationItem
          key={kebabCase(`${title}${url}`)}
          {...{ expanded, title, url, icon, bgcolor, showIconOnCollapse }}
        />
      ))}
    </div>
  );
}

export function DefaultAccountPanel({ expanded }: { expanded: boolean }) {
  const { data } = useSession();
  const userName = data?.user.name ?? data?.user.username ?? data?.user.email ?? '';

  if (!expanded) {
    return <UserOutlined title={userName} className="cursor-pointer text-base text-primary-4" />;
  }
  return (
    <div
      className={classNames(
        'my-0 w-full border border-primary-7 bg-primary-9',
        !expanded && 'hidden',
        'hover:shadow-xl'
      )}
    >
      <div className="flex flex-col gap-y-2 p-5">
        <div className="inline-flex items-center justify-center gap-2 self-start">
          <UserOutlined title={userName} className="text-base text-primary-4" />
          <span className="font-bold text-white">{userName}</span>
        </div>
        <div className="inline-flex flex-row items-center justify-between gap-2">
          <Link href="/account" className="text-base font-normal text-primary-4 hover:text-white">
            Account
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="cursor-pointer text-base font-normal text-primary-4 hover:text-white"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplicationSidebarHeader({
  title,
  expanded,
  toggleExpand,
}: ApplicationSidebarHeaderProps) {
  return (
    <div
      className={classNames(
        'relative my-1 flex w-full items-center',
        !expanded ? 'flex-col items-start gap-2' : 'justify-between'
      )}
    >
      <div
        className={classNames(
          'order-1 w-[21px] rounded-2xl bg-primary-5 py-3 text-base font-semibold text-primary-9',
          !expanded && 'relative top-3 -scale-100 transform [writing-mode:vertical-lr]'
        )}
      >
        {title({ expanded })}
      </div>
      <Button
        type="text"
        onClick={toggleExpand}
        className={classNames(
          'z-20 order-2 border-none bg-transparent',
          !expanded && 'absolute top-0 order-1'
        )}
      />
    </div>
  );
}

export default function ApplicationSidebar({
  title,
  account = DefaultAccountPanel,
  navigation = AppNavigation,
  children,
}: ApplicationSidebarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const expanded = false;
  const toggleExpand = () => {};
  useOnClickOutside(
    ref,
    () => {
      if (expanded) toggleExpand();
    },
    ['mousedown', 'touchstart'],
    (event) => {
      return event && (event.target as HTMLElement)?.closest('.ant-modal-root');
    }
  );

  return (
    <div
      ref={ref}
      className={classNames(
        'relative h-screen bg-primary-9 text-light transition-transform ease-in-out',
        expanded
          ? 'flex w-80 flex-col items-start justify-start px-5 shadow-[0px_5px_15px_rgba(0,0,0,.35)]'
          : 'flex w-10 flex-col items-center justify-between transition-transform ease-in-out will-change-auto'
      )}
    >
      <ApplicationSidebarHeader {...{ title, expanded, toggleExpand }} />
      <div className="primary-scrollbar flex h-[calc(100%-410px)] w-full flex-col items-start justify-start gap-y-1 overflow-y-auto">
        <Suspense>{children?.({ expanded })}</Suspense>
      </div>
      {(account || navigation) && (
        <div className="absolute bottom-0 z-20 mb-4 mt-auto flex w-[calc(100%-2.5rem)] flex-col items-center justify-center bg-primary-9">
          {navigation?.({ expanded })}
        </div>
      )}
    </div>
  );
}
