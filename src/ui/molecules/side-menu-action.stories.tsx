import { RiAddLine, RiArrowRightSLine, RiDownloadLine } from '@remixicon/react';

import Action from '@/ui/molecules/side-menu-action';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/SideMenuAction',
  component: Action,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Action>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-80">
      <Action icon={<RiArrowRightSLine className="size-4" />}>Open workspace</Action>
    </div>
  ),
};

export const Stacked: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <Action icon={<RiAddLine className="size-4" />}>Create simulation</Action>
      <Action icon={<RiDownloadLine className="size-4" />}>Download data</Action>
      <Action icon={<RiArrowRightSLine className="size-4" />}>Go to project</Action>
    </div>
  ),
};
