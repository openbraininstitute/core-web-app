'use client';

import { parseAsString, Parser, useQueryState } from 'nuqs';

import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { cn } from '@/utils/css-class';

import type { WorkflowSimulatePanelKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

export const tabsConfigItems: Array<{
  key: WorkflowSimulatePanelKeys;
  title: string;
}> = [
  {
    key: WorkflowSimulatePanels.Configuration,
    title: 'Configuration',
  },
  {
    key: WorkflowSimulatePanels.Results,
    title: 'Results',
  },
];

export function Header() {
  const breakpoint = useDefaultBreakpoint();
  const [panelId, updatePanel] = useQueryState(
    PanelQueryParam,
    parseAsString
      .withOptions({
        clearOnDefault: false,
        shallow: true,
      })
      .withDefault(WorkflowSimulatePanels.Configuration) as Parser<WorkflowSimulatePanelKeys>
  );

  const onTabClick = (value: string) => updatePanel(value as WorkflowSimulatePanelKeys);

  return (
    <PillTabs
      value={panelId ?? WorkflowSimulatePanels.Configuration}
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
