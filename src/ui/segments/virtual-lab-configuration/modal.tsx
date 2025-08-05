'use client';

import { CloseOutlined } from '@ant-design/icons';
import { match } from 'ts-pattern';
import { useState } from 'react';

import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { TeamTable } from '@/ui/segments/virtual-lab-configuration/sections/team';
import { Credits } from '@/ui/segments/virtual-lab-configuration/sections/credits';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useTabs } from '@/components/detail-view-tabs';
import {
  type TSelectedVirtualLabClickEvent,
  makeSelectVirtualLabClickEvent,
  useVirtualLabClickEvent,
} from '@/ui/segments/virtual-lab-configuration/event';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import { cn } from '@/utils/css-class';

import type { VirtualLab } from '@/api/virtual-lab-svc/queries/types';

type Props = {
  children?: ({ id }: { id: string | null }) => React.ReactNode;
};

function Header({
  onClose,
  virtualLab,
}: {
  onClose: () => void;
  virtualLab: (VirtualLab & { isMine: boolean }) | null;
}) {
  const name = virtualLab?.isMine ? 'My virtual lab' : virtualLab?.name;
  return (
    <div className="flex items-center justify-between p-2 text-white">
      <h2 className="text-xl font-bold select-none">{name}</h2>
      <Button type="button" onClick={onClose}>
        <CloseOutlined />
      </Button>
    </div>
  );
}

const tabsConfigItems: Array<{
  key: 'team' | 'credits';
  title: string;
  position: 'first' | 'middle' | 'last';
}> = [
  {
    key: 'team',
    title: 'Team',
    position: 'first',
  },
  {
    key: 'credits',
    title: 'Credits',
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
      value={activeTab ?? 'team'}
      defaultValue={activeTab ?? 'team'}
      className="border-primary-8/40 w-full rounded-l-full rounded-r-full border shadow-lg"
      activationMode="manual"
      onValueChange={(value) => {
        onChangeTab(value as TabKeys)();
      }}
    >
      <PillTabsList
        className={cn('bg-primary-9 grid h-10 w-full grid-cols-2 p-0', {
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

function Content({ id }: { id: string | null }) {
  const { activeTab } = useTabs<TabKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'section',
    shallow: true,
    clearOnDefault: true,
  });

  if (!id) {
    return null;
  }

  return match(activeTab)
    .with(null, () => <TeamTable virtualLabId={id} />)
    .with('team', () => <TeamTable virtualLabId={id} />)
    .with('credits', () => <Credits virtualLabId={id} />)
    .exhaustive();
}

function ConfigModal({ children }: Props) {
  const [currentVirtualLab, setCurrentVirtualLab] = useState<{
    on: boolean;
    virtualLabId: string | null;
    data: (VirtualLab & { isMine: boolean }) | null;
  }>({
    on: false,
    virtualLabId: null,
    data: null,
  });

  const { reset } = useTabs<TabKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'section',
    shallow: true,
    clearOnDefault: true,
  });

  const onClose = () => {
    setCurrentVirtualLab((prev) => ({ on: false, virtualLabId: null, data: null }));
    makeSelectVirtualLabClickEvent({ on: false, virtualLabId: null, data: null });
    reset();
  };

  useVirtualLabClickEvent((data: CustomEvent<TSelectedVirtualLabClickEvent>) => {
    const isNewVirtualLab = data.detail.virtualLabId !== currentVirtualLab.virtualLabId;
    // only reset tabs when switching to a different virtual lab
    if (isNewVirtualLab && data.detail.on) {
      reset();
    }
    setCurrentVirtualLab(data.detail);
  });

  return (
    <Modal
      open={currentVirtualLab.on}
      maskClosable
      size="lg"
      onClose={onClose}
      width={'calc(100vw - 24.2rem'}
      className="bg-primary-9 top-3 right-3 h-full min-h-[400px] translate-0 transform-none! rounded-md"
      animation="fade"
      maxHeight={'calc(100vh - 1.5rem)'}
      bodyClassName="flex flex-col h-full max-h-full p-0"
      position="right"
    >
      <div className="flex-shrink-0 px-6 pt-4">
        <Header onClose={onClose} virtualLab={currentVirtualLab.data} />
        <Tabs />
      </div>
      <div className="secondary-scrollbar flex-1 overflow-y-auto px-6 py-4 transition-opacity duration-200 ease-in-out">
        {children?.({ id: currentVirtualLab.virtualLabId })}
      </div>
    </Modal>
  );
}

export function VirtualLabConfigModal() {
  return <ConfigModal>{({ id }) => <Content id={id} />}</ConfigModal>;
}
