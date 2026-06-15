import { Button } from '@/ui/molecules/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Popover',
  component: Popover,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Workspace settings</p>
          <p className="text-muted-foreground">
            Adjust the workspace name, members and visibility from here.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const TopAligned: Story = {
  render: () => (
    <div className="flex h-40 items-end">
      <Popover>
        <PopoverTrigger asChild>
          <Button>Above</Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start">
          Top + start aligned content.
        </PopoverContent>
      </Popover>
    </div>
  ),
};
