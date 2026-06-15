import { useState } from 'react';

import { SelectPopover, type SelectPopoverOption } from '@/ui/molecules/select-popover';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/SelectPopover',
  component: SelectPopover,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SelectPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

const regions: Array<SelectPopoverOption> = [
  { value: 'ca1', label: 'CA1 — pyramidal layer' },
  { value: 'ca3', label: 'CA3 — pyramidal layer' },
  { value: 'cortex', label: 'Somatosensory cortex' },
  { value: 'thalamus', label: 'Thalamic relay nuclei' },
  { value: 'cerebellum', label: 'Cerebellar cortex' },
  { value: 'brainstem', label: 'Brainstem' },
];

function Wrapper({ searchable }: { searchable?: boolean }) {
  const [value, setValue] = useState<string | undefined>(undefined);
  return (
    <div className="w-72">
      <SelectPopover
        options={regions}
        selectedValue={value}
        onSelect={(opt) => setValue(opt?.value)}
        searchable={searchable}
        placeholder="Pick a region"
        searchPlaceholder="Search regions…"
      />
    </div>
  );
}

export const Default: Story = { render: () => <Wrapper /> };

export const Searchable: Story = { render: () => <Wrapper searchable /> };

function Many() {
  const options: Array<SelectPopoverOption> = Array.from({ length: 120 }, (_, i) => ({
    value: `opt_${i}`,
    label: `Option ${i + 1}`,
  }));
  const [value, setValue] = useState<string | undefined>(undefined);
  return (
    <div className="w-72">
      <SelectPopover
        options={options}
        selectedValue={value}
        onSelect={(opt) => setValue(opt?.value)}
        searchable
        placeholder="Pick one of 120"
        searchPlaceholder="Search options…"
      />
    </div>
  );
}

export const VirtualizedLongList: Story = {
  render: () => <Many />,
  parameters: {
    docs: {
      description: {
        story:
          'With 120+ options, rows are virtualized via @tanstack/react-virtual so only the visible window mounts.',
      },
    },
  },
};
