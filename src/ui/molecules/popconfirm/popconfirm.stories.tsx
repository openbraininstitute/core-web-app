import { Button } from '@/ui/molecules/button';
import { Popconfirm } from '@/ui/molecules/popconfirm';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Popconfirm',
  component: Popconfirm,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Popconfirm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popconfirm
      title="Discard changes?"
      description="Unsaved edits will be lost."
      onConfirm={() => console.log('confirmed')}
    >
      <Button variant="outline">Discard</Button>
    </Popconfirm>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Popconfirm
      variant="destructive"
      title="Delete this simulation?"
      description="This cannot be undone."
      okText="Delete"
      onConfirm={() => console.log('deleted')}
    >
      <Button variant="destructive">Delete</Button>
    </Popconfirm>
  ),
};

export const AsyncConfirm: Story = {
  render: () => (
    <Popconfirm
      title="Publish workspace?"
      description="This makes it visible to collaborators."
      onConfirm={async () => {
        await new Promise((r) => setTimeout(r, 800));
        console.log('published');
      }}
      okText="Publish"
    >
      <Button>Publish</Button>
    </Popconfirm>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Confirm button shows a disabled pending state while onConfirm resolves.',
      },
    },
  },
};
