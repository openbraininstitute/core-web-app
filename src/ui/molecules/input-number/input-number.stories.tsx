import { useState } from 'react';

import { InputNumber } from '@/ui/molecules/input-number';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/InputNumber',
  component: InputNumber,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof InputNumber>;

export default meta;
type Story = StoryObj<typeof meta>;

function Wrapper(props: Partial<React.ComponentProps<typeof InputNumber>>) {
  const [value, setValue] = useState(props.value ?? 0);
  return <InputNumber {...props} value={value} onChange={setValue} />;
}

export const Default: Story = { render: () => <Wrapper value={1} /> };

export const Bounded: Story = {
  render: () => <Wrapper value={5} min={0} max={10} />,
  parameters: { docs: { description: { story: 'min=0, max=10.' } } },
};

export const Decimal: Story = {
  render: () => <Wrapper value={0.5} min={0} max={1} step={0.1} />,
};

export const Disabled: Story = { render: () => <Wrapper value={3} disabled /> };

export const Small: Story = { render: () => <Wrapper value={2} size="sm" /> };
