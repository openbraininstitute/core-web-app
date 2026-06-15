import { RiInboxLine } from '@remixicon/react';

import { CenteredMessage } from '@/ui/molecules/centered-message';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/CenteredMessage',
  component: CenteredMessage,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof CenteredMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { message: 'Nothing to show here.' },
};

export const WithIcon: Story = {
  args: {
    message: 'No results matched your filter.',
    icon: <RiInboxLine className="text-neutral-3 mx-auto size-10" />,
  },
};
