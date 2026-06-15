import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { TooltipProvider } from '@/ui/molecules/tooltip';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/ButtonCopyId',
  component: ButtonCopyId,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [(Story) => <TooltipProvider>{Story()}</TooltipProvider>],
} satisfies Meta<typeof ButtonCopyId>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 'cmp_abc123' },
};

export const CustomLabel: Story = {
  args: { value: 'sim_42', label: 'Copy simulation ID', tooltip: 'Simulation ID' },
};

export const InHeader: Story = {
  args: { value: 'wsk_a1b2c3' },
  render: (args) => (
    <div className="border-neutral-2 flex w-[480px] items-center justify-between rounded-md border bg-white p-3">
      <div>
        <div className="text-neutral-5 text-sm font-semibold">Workspace alpha</div>
        <div className="text-neutral-4 text-xs">Created 2 days ago</div>
      </div>
      <ButtonCopyId {...args} />
    </div>
  ),
};

export const LongValue: Story = {
  args: {
    value: 'a8f3c2b1-d4e5-6789-fedc-ba9876543210',
    label: 'Copy',
    tooltip: 'Full UUID',
  },
};
