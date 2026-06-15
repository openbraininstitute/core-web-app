import { RiCompass3Line, RiInboxLine } from '@remixicon/react';

import { Button } from '@/ui/molecules/button';
import { Empty } from '@/ui/molecules/empty';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Empty',
  component: Empty,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="border-neutral-2 w-[480px] rounded-lg border">
      <Empty {...args} />
    </div>
  ),
};

export const WithDescription: Story = {
  args: { title: 'No simulations', description: 'Create your first simulation to see it here.' },
  render: (args) => (
    <div className="border-neutral-2 w-[480px] rounded-lg border">
      <Empty {...args} />
    </div>
  ),
};

export const WithAction: Story = {
  args: {
    icon: <RiInboxLine />,
    title: 'Inbox is empty',
    description: 'New invitations will appear here.',
    action: <Button size="sm">Invite a teammate</Button>,
  },
  render: (args) => (
    <div className="border-neutral-2 w-[480px] rounded-lg border">
      <Empty {...args} />
    </div>
  ),
};

export const CustomIcon: Story = {
  args: { icon: <RiCompass3Line />, title: 'No regions matched your filter' },
  render: (args) => (
    <div className="border-neutral-2 w-[480px] rounded-lg border">
      <Empty {...args} />
    </div>
  ),
};
