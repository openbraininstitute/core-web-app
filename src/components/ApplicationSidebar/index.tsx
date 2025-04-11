import { Suspense, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from 'antd';
import Link from 'next/link';
import kebabCase from 'lodash/kebabCase';
import Icon, { UserOutlined, HomeOutlined } from '@ant-design/icons';

import { classNames, signOut } from '@/util/utils';
import useOnClickOutside from '@/hooks/useOnClickOutside';
import UserMenu from '@/components/user-menu';

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
];

export function NavigationItem({ url, name, description, bgcolor }: NavigationItemProps) {
  return (
    <li
      key={url}
      className={classNames(
        'hover:bg-primary-7 relative mx-auto flex w-full cursor-pointer p-4',
        bgcolor
      )}
    >
      <Link href={url} className="mx-auto w-full">
        <h1 className="text-xl font-bold text-white">{name}</h1>
        <p
          title={description}
          className="text-primary-4 mt-1 line-clamp-1 text-left text-sm font-thin select-none"
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
        <Icon component={icon} title={title} className="text-primary-4 my-2" />
      </Link>
    );
  }
  return (
    <Link
      href={url}
      className={classNames(
        'hover:bg-primary-7 inline-flex w-full flex-row items-center justify-between px-3 py-3',
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
    return <UserOutlined title={userName} className="text-primary-4 cursor-pointer text-base" />;
  }
  return (
    <div
      className={classNames(
        'border-primary-7 bg-primary-9 my-0 w-full border',
        !expanded && 'hidden',
        'hover:shadow-xl'
      )}
    >
      <div className="flex flex-col gap-y-2 p-5">
        <div className="inline-flex items-center justify-center gap-2 self-start">
          <UserOutlined title={userName} className="text-primary-4 text-base" />
          <span className="font-bold text-white">{userName}</span>
        </div>
        <div className="inline-flex flex-row items-center justify-between gap-2">
          <Link href="/account" className="text-primary-4 text-base font-normal hover:text-white">
            Account
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="text-primary-4 cursor-pointer text-base font-normal hover:text-white"
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
        !expanded ? 'flex-col gap-2' : 'justify-between'
      )}
    >
      <div className="flex h-[90px] w-[45px] items-center justify-center">
        <div className="bg-primary-5 origin-center -rotate-90 transform rounded-3xl px-4 py-1 whitespace-nowrap">
          <span className="text-base">{title({ expanded })}</span>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationSidebar({ title, children }: ApplicationSidebarProps) {
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
        'bg-primary-9 text-light relative h-screen w-[45px] transition-transform ease-in-out',
        expanded
          ? 'flex w-80 flex-col items-start justify-start px-5 shadow-[0px_5px_15px_rgba(0,0,0,.35)]'
          : 'flex w-10 flex-col items-center justify-between transition-transform ease-in-out will-change-auto'
      )}
    >
      <ApplicationSidebarHeader {...{ title, expanded, toggleExpand }} />
      <div className="primary-scrollbar flex h-[calc(100%-410px)] w-full flex-col items-start justify-start gap-y-1 overflow-y-auto">
        <Suspense>{children?.({ expanded })}</Suspense>
      </div>
      <div className="mb-2 flex flex-col items-center justify-center">
        <UserMenu>
          <UserOutlined className="group-hover:text-white" />
        </UserMenu>
        <Link
          href="/app/virtual-lab"
          className={classNames(
            'group inline-flex w-full flex-row items-center justify-between px-3 py-3'
          )}
        >
          <HomeOutlined className="text-primary-2 cursor-pointer group-hover:text-white" />
        </Link>
      </div>
    </div>
  );
}
