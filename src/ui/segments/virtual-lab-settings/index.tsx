'use client';

import { CloseOutlined } from '@ant-design/icons';
import { match } from 'ts-pattern';
import { useState } from 'react';

import { CustomPopover } from '@/features/entities/neuron-simulation/experiment/elements/popover';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { TeamTable } from '@/ui/segments/virtual-lab-settings/sections/team';
import { Credits } from '@/ui/segments/virtual-lab-settings/sections/credits';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useTabs } from '@/components/detail-view-tabs';
import { useUserRole } from '@/hooks/use-user-role';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { VirtualLab } from '@/api/virtual-lab-svc/queries/types';

function Header({
  onClose,
  virtualLab,
}: {
  onClose: () => void;
  virtualLab?: (VirtualLab & { isMine: boolean }) | null;
}) {
  const name = virtualLab?.isMine ? 'My virtual lab' : virtualLab?.name;
  const subtitle = virtualLab?.isMine ? virtualLab.name : null;
  const numberOfProjects = virtualLab?.projects_count ?? 0;
  return (
    <div className="flex items-center justify-between py-4 text-white">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-3xl font-bold select-none">{name}</h2>
        {subtitle && <small className="text-primary-2 text-lg">{subtitle}</small>}
      </div>
      <div className="flex items-center justify-center gap-1.5">
        {!!numberOfProjects && (
          <p className="text-primary-3 w-max">
            {numberOfProjects} {numberOfProjects > 1 ? 'projects' : 'project'}
          </p>
        )}
        <Button type="button" onClick={onClose} className="h-10 w-10 hover:bg-white/10">
          <CloseOutlined />
        </Button>
      </div>
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
    title: 'Members',
    position: 'first',
  },
  {
    key: 'credits',
    title: 'Credits',
    position: 'last',
  },
];

type TabKeys = (typeof tabsConfigItems)[number]['key'];

function Tabs({ id }: { id?: string | null }) {
  const breakpoint = useDefaultBreakpoint();
  const { activeTab, onChangeTab } = useTabs<TabKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'section',
    shallow: true,
    clearOnDefault: true,
  });
  const { isAdmin } = useUserRole({ virtualLabId: id! });
  const [popoverOpen, setIsPopoverOpen] = useState(false);

  const onOpenChange = (visible: boolean) => {
    if (!isAdmin || !visible) setIsPopoverOpen(true);
    else setIsPopoverOpen(false);
  };

  return (
    <PillTabs
      value={activeTab ?? 'team'}
      defaultValue={activeTab ?? 'team'}
      className="border-primary-8/40 w-full rounded-l-full rounded-r-full border shadow-lg"
      activationMode="manual"
      onValueChange={(value) => {
        if (value === 'credits' && !isAdmin) return;
        onChangeTab(value as TabKeys)();
      }}
    >
      <PillTabsList
        className={cn('bg-primary-9 grid h-10 w-full grid-cols-2 p-0', {
          'h-12': breakpoint === 'xl',
        })}
      >
        <PillTabsTrigger
          key="team"
          value="team"
          position="first"
          className={cn(
            'hover:bg-neutral-1 hover:text-primary-8 data-[state=active]:text-primary-9 h-10 px-14! py-3 text-base text-white select-none data-[state=active]:bg-white data-[state=active]:font-bold',
            { 'h-12': breakpoint === 'xl' }
          )}
        >
          Members
        </PillTabsTrigger>
        <CustomPopover
          when={['hover']}
          message="Only Administrator can explore virtual lab credits."
          placement="bottom"
          visible={popoverOpen}
          onOpenChange={onOpenChange}
        >
          <PillTabsTrigger
            key="credits"
            value="credits"
            position="last"
            className={cn(
              'hover:bg-neutral-1 hover:text-primary-8 data-[state=active]:text-primary-9 h-10 px-14! py-3 text-base text-white select-none data-[state=active]:bg-white data-[state=active]:font-bold',
              { 'h-12': breakpoint === 'xl', 'cursor-not-allowed opacity-50': !isAdmin }
            )}
            onMouseLeave={() => setIsPopoverOpen(false)}
          >
            Credits
          </PillTabsTrigger>
        </CustomPopover>
      </PillTabsList>
    </PillTabs>
  );
}

function Content({ id }: { id?: string | null }) {
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
    .otherwise(() => <TeamTable virtualLabId={id} />);
}

type Props = {
  onClose: () => void;
  payload: {
    virtualLabId: string | null;
    data: (VirtualLab & { isMine: boolean }) | null;
  } | null;
};

export function VirtualLabConfiguration({ onClose, payload }: Props) {
  return (
    <div
      id="virtual-lab-settings-container"
      className="flex h-full max-h-[calc(100vh-1.5rem)] min-h-0 flex-col overflow-hidden"
    >
      <div
        id="virtual-lab-settings-header"
        className="bg-primary-9 sticky top-0 left-0 z-[1002] px-6 pt-2"
      >
        <Header onClose={onClose} virtualLab={payload?.data} />
        <Tabs id={payload?.virtualLabId} />
      </div>
      <div
        id="virtual-lab-settings-content"
        className="primary-scrollbar h-full min-h-0 flex-1 overflow-y-auto transition-opacity duration-200 ease-in-out"
      >
        <Content id={payload?.virtualLabId} />
      </div>
    </div>
  );
}
