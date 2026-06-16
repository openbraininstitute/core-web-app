'use client';

import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { RiCheckFill, RiFileCopyLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { match } from 'ts-pattern';

import { getUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { useTabs } from '@/components/detail-view-tabs';
import { SignOutFill } from '@/components/icons/EditorIcons';
import { hasVisibleFlags } from '@/features/feature-flags/flags';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { ExperimentalFeatures } from '@/ui/segments/profile/sections/experimental-features';
import { Invoices } from '@/ui/segments/profile/sections/invoices';
import { UserProfile } from '@/ui/segments/profile/sections/profile';
import { Subscription } from '@/ui/segments/profile/sections/subscription';
import { keyBuilder } from '@/ui/use-query-keys/user';
import { cn } from '@/utils/css-class';

function Header({ onClose }: { onClose: () => void }) {
  const session = useSession();
  const { data, isLoading, isError } = useQuery({
    queryKey: keyBuilder.profile(),
    queryFn: getUserProfile,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const [, copy, , copying] = useCopyToClipboard();
  if (isLoading) return <LoadingOutlined spin />;
  if (isError) return <div>Error</div>;
  const onCopyToken = async () => {
    if (session && session.data) copy(session.data?.accessToken);
  };
  const userName = data?.profile.first_name
    ? `${data?.profile.first_name} ${data?.profile.last_name}`
    : data?.profile.preferred_username;

  return (
    <div className="flex items-center justify-between py-2 text-white select-none">
      <div>
        <h2 className="flex flex-col text-lg font-semibold">
          <span className="text-primary-4 text-xl font-light">Profile</span>
          <span className="text-3xl font-bold text-white">{userName}</span>
        </h2>
      </div>
      <div className="flex flex-row items-center gap-x-2">
        <Button
          variant="default"
          rounded
          size="lg"
          onClick={onCopyToken}
          className="border-primary-7! hover:text-primary-4 border px-6 py-2 text-lg! font-semibold text-white"
        >
          {copying ? (
            <RiCheckFill className="text-primary-3 ml-auto" />
          ) : (
            <RiFileCopyLine className="text-primary-3 ml-auto" />
          )}
          Copy token
        </Button>
        <Button
          variant="default"
          rounded
          size="lg"
          onClick={onCopyToken}
          className="border-primary-7! hover:text-primary-4 border px-6 py-2 text-lg! font-semibold text-white"
          asChild
        >
          <Link href="/app/log-out">
            <SignOutFill className="text-primary-3 ml-auto" />
            Logout
          </Link>
        </Button>
        <Button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-full! hover:bg-white/10"
        >
          <CloseOutlined />
        </Button>
      </div>
    </div>
  );
}

const tabsConfigItems: Array<{
  key: 'profile' | 'subscription' | 'invoices' | 'experimental-features';
  title: string;
}> = [
  {
    key: 'profile',
    title: 'Profile',
  },
  {
    key: 'subscription',
    title: 'Subscription',
  },
  {
    key: 'invoices',
    title: 'Invoices',
  },
];

if (hasVisibleFlags) {
  tabsConfigItems.push({
    key: 'experimental-features',
    title: 'Experimental Features',
  });
}

type TabKeys = (typeof tabsConfigItems)[number]['key'];

function Tabs({ defaultKey }: { defaultKey?: string }) {
  const breakpoint = useDefaultBreakpoint();
  const { activeTab, onChangeTab } = useTabs<TabKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'section',
    shallow: true,
    clearOnDefault: true,
    defaultKey,
  });

  return (
    <PillTabs
      value={activeTab ?? 'profile'}
      defaultValue={activeTab ?? 'profile'}
      className="border-primary-8/40 w-full rounded-l-full rounded-r-full border shadow-lg"
      activationMode="manual"
      onValueChange={(value) => {
        onChangeTab(value as TabKeys)();
      }}
    >
      <PillTabsList
        className={cn('bg-primary-9 grid h-10 w-full auto-cols-fr grid-flow-col p-0', {
          'h-12': breakpoint === 'xl',
        })}
      >
        {tabsConfigItems.map((tab) => (
          <PillTabsTrigger
            key={tab.key}
            value={tab.key}
            className={cn(
              'hover:bg-neutral-1 hover:text-primary-8 data-[state=active]:text-primary-9 h-10 px-14!',
              'py-3 text-base text-white select-none data-[state=active]:bg-white data-[state=active]:font-bold',
              { 'h-12': breakpoint === 'xl' }
            )}
          >
            {tab.title}
          </PillTabsTrigger>
        ))}
      </PillTabsList>
    </PillTabs>
  );
}

function Content({ defaultKey }: { defaultKey?: string }) {
  const { activeTab } = useTabs<TabKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'section',
    shallow: true,
    clearOnDefault: true,
    defaultKey,
  });

  return match(activeTab)
    .with(null, () => <UserProfile />)
    .with('profile', () => <UserProfile />)
    .with('subscription', () => <Subscription />)
    .with('invoices', () => (
      <div className="flex min-h-0 flex-1 flex-col">
        <Invoices />
      </div>
    ))
    .with('experimental-features', () => <ExperimentalFeatures />)
    .otherwise(() => {
      return <UserProfile />;
    });
}

type Props = {
  onClose: () => void;
  data: { section?: TabKeys };
};

export function AccountSettings({ onClose, data }: Props) {
  const { reset } = useTabs<TabKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'section',
    shallow: true,
    clearOnDefault: true,
    defaultKey: data?.section,
  });

  const onCloseLocal = () => {
    onClose();
    reset();
  };

  return (
    <div
      id="account-settings-container"
      className="flex h-full max-h-[calc(100vh-1.5rem)] min-h-0 flex-col overflow-hidden"
    >
      <div
        id="account-settings-header"
        className="bg-primary-9 sticky top-0 left-0 z-1002 px-6 py-2"
      >
        <Header onClose={onCloseLocal} />
        <Tabs defaultKey={data?.section} />
      </div>
      <div
        id="account-settings-content"
        className={cn(
          'mb-1 flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4 transition-opacity duration-200 ease-in-out'
        )}
      >
        <div className="primary-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Content defaultKey={data?.section} />
        </div>
      </div>
    </div>
  );
}
