'use client';

import { atom, useAtom } from 'jotai';

import { WorkflowSimulatePanels } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { cn } from '@/utils/css-class';

import type { WorkflowSimulatePanelKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

export const tabsConfigItems: Array<{
  key: WorkflowSimulatePanelKeys;
  title: string;
  position: 'first' | 'middle' | 'last';
}> = [
  {
    key: WorkflowSimulatePanels.Configuration,
    title: 'Configuration',
    position: 'first',
  },
  {
    key: WorkflowSimulatePanels.Results,
    title: 'Results',
    position: 'last',
  },
];

export const headerTabsAtom = atom<WorkflowSimulatePanelKeys>(WorkflowSimulatePanels.Configuration);

export function Header() {
  const breakpoint = useDefaultBreakpoint();
  const [active, updateActive] = useAtom(headerTabsAtom);

  const onTabClick = (value: string) => updateActive(value as WorkflowSimulatePanelKeys);

  return (
    <PillTabs
      value={active ?? WorkflowSimulatePanels.Configuration}
      defaultValue={WorkflowSimulatePanels.Configuration}
      className="w-max"
      activationMode="manual"
      onValueChange={onTabClick}
    >
      <PillTabsList
        className={cn('grid h-10 w-full grid-cols-2 bg-white p-0 shadow-2xl', {
          'h-12': breakpoint === 'xl',
        })}
      >
        {tabsConfigItems.map((tab) => (
          <PillTabsTrigger
            key={tab.key}
            value={tab.key}
            position={tab.position}
            className={cn(
              'data-[state=active]:bg-primary-9 hover:bg-neutral-1 hover:text-primary-8 h-10 px-14! py-3 text-base select-none data-[state=active]:font-bold data-[state=active]:text-white',
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
