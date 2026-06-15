import { useId } from 'react';

import { Input } from '@/ui/molecules/input';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { placeholder: 'Type here' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: (args) => <Input {...args} className="w-64" /> };

export const Disabled: Story = {
  args: { disabled: true, value: 'Read only' },
  render: (args) => <Input {...args} className="w-64" />,
};

export const Invalid: Story = {
  args: { 'aria-invalid': true, defaultValue: 'broken@' },
  render: (args) => <Input {...args} className="w-64" />,
};

export const Password: Story = {
  args: { type: 'password', placeholder: '••••••••' },
  render: (args) => <Input {...args} className="w-64" />,
};

export const File: Story = {
  args: { type: 'file', placeholder: undefined },
  render: (args) => <Input {...args} className="w-64" />,
};

function Labelled(args: React.ComponentProps<typeof Input>) {
  const id = useId();
  return (
    <div className="flex w-64 flex-col gap-1 text-sm">
      <label htmlFor={id} className="font-medium">
        Email
      </label>
      <Input {...args} id={id} type="email" placeholder="you@example.com" />
    </div>
  );
}

export const WithLabel: Story = { render: (args) => <Labelled {...args} /> };
