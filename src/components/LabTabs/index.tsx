import { ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';

import TopNavigation from '@/components/TopNavigation';

type BrainFactoryTabsProps = {
  children: ReactNode;
};

export default function BrainFactoryTabs({ children }: BrainFactoryTabsProps) {
  return (
    <div className="flex w-full">
      <TopNavigation.Main>
        <div className="flex">
          <Popover.Root>
            <Popover.Trigger className="flex-auto bg-secondary-2 px-8 text-white">
              Build & Simulate
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="z-[100] flex flex-col text-white">
                {children}
                <Popover.Arrow className="fill-white" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </TopNavigation.Main>

      <TopNavigation.PrimaryDropdown
        items={[
          {
            label: 'Cell composition',
            href: '/app/build/cell-composition/interactive',
            baseHref: '/app/build/cell-composition',
          },
          {
            label: 'Cell model assignment',
            href: '/app/build/cell-model-assignment',
            baseHref: '/app/build/cell-model-assignment',
          },
          {
            label: 'Connectome definition',
            href: '/app/build/connectome-definition/configuration/macro',
            baseHref: '/app/build/connectome-definition',
          },
          {
            label: 'Connectome model assignment',
            href: '/app/build/connectome-model-assignment/configuration',
            baseHref: '/app/build/connectome-model-assignment',
          },
        ]}
      />
    </div>
  );
}
