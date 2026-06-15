import { useId } from 'react';

import { Checkbox } from '@/ui/molecules/checkbox';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const DisabledChecked: Story = { args: { disabled: true, defaultChecked: true } };

function LabeledCheckbox({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Checkbox>) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <Checkbox id={id} {...props} /> {label}
    </label>
  );
}

export const WithLabel: Story = {
  render: (args) => <LabeledCheckbox {...args} label="Accept terms" />,
};

export const Group: Story = {
  render: () => (
    <div className="flex flex-col gap-2 text-sm">
      <LabeledCheckbox defaultChecked label="Excitatory" />
      <LabeledCheckbox label="Inhibitory" />
      <LabeledCheckbox defaultChecked label="Modulatory" />
    </div>
  ),
};
