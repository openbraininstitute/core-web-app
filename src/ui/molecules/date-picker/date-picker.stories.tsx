import { useState } from 'react';

import { DatePicker, DateRangePicker } from '@/ui/molecules/date-picker';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

function Single() {
  const [value, setValue] = useState<string>('');
  return <DatePicker value={value} onChange={setValue} />;
}

function Range() {
  const [value, setValue] = useState<{ from?: string; to?: string }>({});
  return <DateRangePicker value={value} onChange={setValue} />;
}

export const Default: Story = { render: () => <Single /> };

export const Bounded: Story = {
  render: () => {
    const today = new Date().toISOString().slice(0, 10);
    return <DatePicker min={today} />;
  },
  parameters: { docs: { description: { story: 'Min set to today — disables past dates.' } } },
};

export const Range_: Story = { name: 'Range', render: () => <Range /> };
