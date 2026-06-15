import { RiCheckLine, RiErrorWarningLine, RiInformationLine } from '@remixicon/react';

import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  AlertToolbar,
} from '@/ui/molecules/alert';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['secondary', 'primary', 'destructive', 'success', 'info', 'warning', 'mono'],
    },
    appearance: { control: 'select', options: ['solid', 'outline', 'light', 'stroke'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    close: { control: 'boolean' },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { variant: 'secondary', appearance: 'solid', close: false },
  render: (args) => (
    <Alert {...args}>
      <AlertContent>
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>You can change this anytime in settings.</AlertDescription>
      </AlertContent>
    </Alert>
  ),
};

export const Destructive: Story = {
  args: { variant: 'destructive', appearance: 'light', close: true },
  render: (args) => (
    <Alert {...args}>
      <AlertIcon>
        <RiErrorWarningLine />
      </AlertIcon>
      <AlertContent>
        <AlertTitle>Could not save</AlertTitle>
        <AlertDescription>Check your connection and try again.</AlertDescription>
      </AlertContent>
    </Alert>
  ),
};

export const Success: Story = {
  args: { variant: 'success', appearance: 'light' },
  render: (args) => (
    <Alert {...args}>
      <AlertIcon>
        <RiCheckLine />
      </AlertIcon>
      <AlertContent>
        <AlertTitle>Saved</AlertTitle>
        <AlertDescription>Changes published successfully.</AlertDescription>
      </AlertContent>
    </Alert>
  ),
};

export const Info: Story = {
  args: { variant: 'info', appearance: 'outline' },
  render: (args) => (
    <Alert {...args}>
      <AlertIcon>
        <RiInformationLine />
      </AlertIcon>
      <AlertContent>
        <AlertTitle>New version available</AlertTitle>
        <AlertDescription>Reload to update.</AlertDescription>
      </AlertContent>
      <AlertToolbar>
        <button type="button" className="text-sm font-medium underline">
          Reload
        </button>
      </AlertToolbar>
    </Alert>
  ),
};
