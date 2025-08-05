'use client';

import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { match } from 'ts-pattern';

import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { Subscription } from '@/ui/segments/profile/sections/subscription';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { UserProfile } from '@/ui/segments/profile/sections/profile';
import { getUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { Invoices } from '@/ui/segments/profile/sections/invoices';
import { useTabs } from '@/components/detail-view-tabs';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import { cn } from '@/utils/css-class';
import {
  type TTriggerProfileClickEvent,
  makeTriggerProfileClickEvent,
  profileClickEventListener,
} from '@/ui/segments/profile/event';
import { keyBuilder } from '@/ui/queries/user';

type Props = {
  children?: React.ReactNode;
};

function Header({ onClose }: { onClose: () => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: keyBuilder.profile(),
    queryFn: getUserProfile,
  });

  if (isLoading) return <LoadingOutlined spin />;
  if (isError) return <div>Error</div>;

  const userName = data?.profile.first_name
    ? `${data?.profile.first_name} ${data?.profile.last_name}`
    : data?.profile.preferred_username;

  return (
    <div className="flex items-center justify-between p-2 text-white">
      <div>
        <h2 className="text-lg font-semibold">
          <span className="text-primary-4 font-light">Profile</span>
          <span className="ml-2 text-xl font-bold text-white">{userName}</span>
        </h2>
        <p className="text-neutral-2 text-sm">Manage your profile information and subscription.</p>
      </div>
      <Button type="button" onClick={onClose}>
        <CloseOutlined />
      </Button>
    </div>
  );
}

const tabsConfigItems: Array<{
  key: 'profile' | 'subscription' | 'invoices';
  title: string;
  position: 'first' | 'middle' | 'last';
}> = [
  {
    key: 'profile',
    title: 'Profile',
    position: 'first',
  },
  {
    key: 'subscription',
    title: 'Subscription',
    position: 'middle',
  },
  {
    key: 'invoices',
    title: 'Invoices',
    position: 'last',
  },
];

type TabKeys = (typeof tabsConfigItems)[number]['key'];

function Tabs() {
  const breakpoint = useDefaultBreakpoint();
  const { activeTab, onChangeTab } = useTabs<TabKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'section',
    shallow: true,
    clearOnDefault: true,
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
        className={cn('bg-primary-9 grid h-10 w-full grid-cols-3 p-0', {
          'h-12': breakpoint === 'xl',
        })}
      >
        {tabsConfigItems.map((tab) => (
          <PillTabsTrigger
            key={tab.key}
            value={tab.key}
            position={tab.position}
            className={cn(
              'hover:bg-neutral-1 hover:text-primary-8 data-[state=active]:text-primary-9 h-10 px-14! py-3 text-base text-white select-none data-[state=active]:bg-white data-[state=active]:font-bold',
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

function Content() {
  const { activeTab } = useTabs<TabKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'section',
    shallow: true,
    clearOnDefault: true,
  });

  return match(activeTab)
    .with(null, () => <UserProfile />)
    .with('profile', () => <UserProfile />)
    .with('subscription', () => <Subscription />)
    .with('invoices', () => <Invoices />)
    .exhaustive();
}

function ConfigModal({ children }: Props) {
  const [open, setOpen] = useState(false);
  const { reset } = useTabs<TabKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'section',
    shallow: true,
    clearOnDefault: true,
  });

  const onClose = () => {
    setOpen(false);
    makeTriggerProfileClickEvent({ on: false });
    reset();
  };

  useEffect(() => {
    const unsubscribe = profileClickEventListener(
      (data: CustomEvent<TTriggerProfileClickEvent>) => {
        setOpen(data.detail.on);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <Modal
      maskClosable
      destroyOnClose
      open={open}
      size="lg"
      onClose={onClose}
      width={'calc(100vw - 24.2rem'}
      className="bg-primary-9 top-3 right-3 h-full min-h-[400px] translate-0 transform-none! rounded-md"
      animation="fade"
      maxHeight={'calc(100vh - 1.5rem)'}
      bodyClassName="flex flex-col h-full max-h-full p-0"
      position="right"
    >
      <div className="flex flex-shrink-0 flex-col gap-3 px-6 py-4">
        <Header onClose={onClose} />
        <Tabs />
      </div>
      <div className="primary-scrollbar mb-10 flex-1 overflow-y-auto px-6 py-4">{children}</div>
    </Modal>
  );
}

export function UserConfigurationModal() {
  return (
    <ConfigModal>
      <Content />
    </ConfigModal>
  );
}
