import { RiAddLine, RiArrowDownSLine } from '@remixicon/react';

import { Button, ButtonArrow } from '@/ui/molecules/button';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'success', 'outline', 'ghost', 'link', 'icon', 'shadow'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'md', 'lg', 'responsive'],
    },
    active: { control: 'boolean' },
    rounded: { control: 'boolean' },
    borderless: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    children: 'Button',
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Destructive: Story = { args: { variant: 'destructive' } };

export const Success: Story = { args: { variant: 'success' } };

export const Outline: Story = { args: { variant: 'outline' } };

export const Ghost: Story = { args: { variant: 'ghost' } };

export const Link: Story = { args: { variant: 'link' } };

export const Shadow: Story = {
  args: { variant: 'shadow', children: 'Continue with shadow' },
};

export const Disabled: Story = { args: { disabled: true } };

export const Sizes: Story = {
  args: { children: undefined },
  render: (args) => (
    <div className="flex items-center gap-3">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="default">
        Default
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
  ),
};

export const Variants: Story = {
  args: { children: undefined },
  render: (args) => (
    <div className="grid grid-cols-3 gap-3">
      <Button {...args} variant="default">
        Default
      </Button>
      <Button {...args} variant="destructive">
        Destructive
      </Button>
      <Button {...args} variant="success">
        Success
      </Button>
      <Button {...args} variant="outline">
        Outline
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
      <Button {...args} variant="link">
        Link
      </Button>
    </div>
  ),
};

export const WithArrow: Story = {
  args: { children: undefined },
  render: (args) => (
    <Button {...args}>
      Open menu
      <ButtonArrow />
    </Button>
  ),
};

export const IconOnly: Story = {
  args: { children: undefined, variant: 'icon', size: 'md' },
  render: (args) => (
    <Button {...args} aria-label="Add item">
      <RiAddLine className="size-4" />
    </Button>
  ),
};

export const Active: Story = {
  args: { active: true, variant: 'outline' },
};

export const Rounded: Story = {
  args: { rounded: true, children: undefined },
  render: (args) => (
    <Button {...args}>
      Rounded <RiArrowDownSLine className="size-4" />
    </Button>
  ),
};
