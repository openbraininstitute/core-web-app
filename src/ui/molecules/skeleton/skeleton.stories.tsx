import { Skeleton } from '@/ui/molecules/skeleton';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    active: { control: 'boolean' },
  },
  args: { active: true },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Block: Story = {
  render: (args) => <Skeleton {...args} className="h-6 w-64" />,
};

export const Avatar: Story = {
  render: (args) => <Skeleton {...args} className="size-12 rounded-full" />,
};

export const ListRow: Story = {
  render: (args) => (
    <div className="flex w-80 items-center gap-3">
      <Skeleton {...args} className="size-12 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton {...args} className="h-4 w-3/4" />
        <Skeleton {...args} className="h-3 w-1/2" />
      </div>
    </div>
  ),
};

export const CardPlaceholder: Story = {
  render: (args) => (
    <div className="border-neutral-2 w-80 space-y-3 rounded-xl border p-6">
      <Skeleton {...args} className="h-5 w-40" />
      <Skeleton {...args} className="h-3 w-full" />
      <Skeleton {...args} className="h-3 w-5/6" />
      <Skeleton {...args} className="h-3 w-2/3" />
    </div>
  ),
};

export const Static: Story = {
  args: { active: false },
  render: (args) => <Skeleton {...args} className="h-6 w-64" />,
};
