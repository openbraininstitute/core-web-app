import { Loader } from '@/ui/molecules/loader';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Loader',
  component: Loader,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Loader>;

export default meta;
type Story = StoryObj<typeof meta>;

const Stage = ({ children }: { children: React.ReactNode }) => (
  <div className="border-neutral-2 relative h-32 w-64 rounded-md border bg-neutral-1">
    {children}
  </div>
);

export const Default: Story = {
  render: (args) => (
    <Stage>
      <Loader {...args} />
    </Stage>
  ),
};

export const Small: Story = {
  args: { size: 'sm' },
  render: (args) => (
    <Stage>
      <Loader {...args} />
    </Stage>
  ),
};
export const Medium: Story = {
  args: { size: 'md' },
  render: (args) => (
    <Stage>
      <Loader {...args} />
    </Stage>
  ),
};
export const Large: Story = {
  args: { size: 'lg' },
  render: (args) => (
    <Stage>
      <Loader {...args} />
    </Stage>
  ),
};
