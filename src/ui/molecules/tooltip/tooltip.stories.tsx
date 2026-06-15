import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/molecules/tooltip';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [(Story) => <TooltipProvider>{Story()}</TooltipProvider>],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>Append to selection</TooltipContent>
    </Tooltip>
  ),
};

export const Sides: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-12">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Tooltip key={side}>
          <TooltipTrigger asChild>
            <Button variant="outline">{side}</Button>
          </TooltipTrigger>
          <TooltipContent side={side}>Side: {side}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
};

export const NoArrow: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">No arrow</Button>
      </TooltipTrigger>
      <TooltipContent showArrow={false}>Cleaner edge</TooltipContent>
    </Tooltip>
  ),
};
