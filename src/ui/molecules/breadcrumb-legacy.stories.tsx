import Breadcrumb from '@/ui/molecules/breadcrumb';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Breadcrumb (legacy)',
  component: Breadcrumb,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Single-segment breadcrumb chip. Kept for legacy callers. New code should use the Radix-based Breadcrumb in `src/ui/molecules/breadcrumb/`.',
      },
    },
  },
  argTypes: {
    showChevron: { control: 'boolean' },
  },
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Workspaces', showChevron: true },
};

export const NoChevron: Story = {
  args: { children: 'Current page', showChevron: false },
};
