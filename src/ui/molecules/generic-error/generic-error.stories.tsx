import { RiErrorWarningLine } from '@remixicon/react';

import { GenericError } from '@/ui/molecules/generic-error';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/GenericError',
  component: GenericError,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof GenericError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <GenericError
      icon={<RiErrorWarningLine className="size-8" />}
      content="Something went wrong while loading this view."
    />
  ),
};

export const WithSupportLink: Story = {
  render: () => (
    <GenericError
      shouldContactSupport
      icon={<RiErrorWarningLine className="size-8" />}
      content="We couldn't fetch your data. If the issue persists, contact support."
    />
  ),
};
