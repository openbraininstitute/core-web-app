import { RiCloseLine, RiStarFill } from '@remixicon/react';

import { Badge, BadgeButton } from '@/ui/molecules/badge';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'md', 'lg'],
    },
    rounded: { control: 'boolean' },
  },
  args: {
    children: 'Badge',
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Destructive: Story = { args: { variant: 'destructive' } };

export const Outline: Story = { args: { variant: 'outline' } };

export const Rounded: Story = { args: { rounded: true } };

export const Sizes: Story = {
  args: { children: undefined },
  render: (args) => (
    <div className="flex items-center gap-2">
      <Badge {...args} size="sm">
        Small
      </Badge>
      <Badge {...args}>Default</Badge>
      <Badge {...args} size="md">
        Medium
      </Badge>
      <Badge {...args} size="lg">
        Large
      </Badge>
    </div>
  ),
};

export const WithIcon: Story = {
  args: { children: undefined },
  render: (args) => (
    <Badge {...args}>
      <RiStarFill className="size-3" /> Featured
    </Badge>
  ),
};

export const Removable: Story = {
  args: { children: undefined, variant: 'outline' },
  render: (args) => (
    <Badge {...args}>
      Tag
      <BadgeButton aria-label="Remove">
        <RiCloseLine className="size-3" />
      </BadgeButton>
    </Badge>
  ),
};
