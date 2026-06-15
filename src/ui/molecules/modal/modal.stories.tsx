import { useState } from 'react';

import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'full', 'auto'] },
    position: { control: 'select', options: ['center', 'top', 'bottom', 'left', 'right'] },
    animation: {
      control: 'select',
      options: ['fade', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'scale', 'none'],
    },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

function ModalDemo(args: Partial<React.ComponentProps<typeof Modal>>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal
        {...args}
        open={open}
        onClose={() => setOpen(false)}
        title="Confirm action"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Confirm</Button>
          </>
        }
      >
        Are you sure you want to delete this simulation? This cannot be undone.
      </Modal>
    </>
  );
}

export const Default: Story = { render: (args) => <ModalDemo {...args} /> };

export const Large: Story = {
  args: { size: 'lg' },
  render: (args) => <ModalDemo {...args} />,
};

export const ScaleAnimation: Story = {
  args: { animation: 'scale' },
  render: (args) => <ModalDemo {...args} />,
};

export const TopPosition: Story = {
  args: { position: 'top', animation: 'slideDown' },
  render: (args) => <ModalDemo {...args} />,
};
