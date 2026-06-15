import Close from '@/ui/molecules/close';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Close',
  component: Close,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { href: '#' },
} satisfies Meta<typeof Close>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InsideToolbar: Story = {
  render: (args) => (
    <div className="border-neutral-2 flex w-80 items-center justify-between rounded-md border p-3">
      <span className="text-sm font-medium">Panel title</span>
      <Close {...args} />
    </div>
  ),
};
