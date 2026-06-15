import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Pick a region" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ca1">CA1</SelectItem>
        <SelectItem value="ca3">CA3</SelectItem>
        <SelectItem value="cortex">Somatosensory cortex</SelectItem>
        <SelectItem value="thalamus">Thalamus</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Grouped: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Pick a model" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Single-cell</SelectLabel>
          <SelectItem value="me-model">ME-Model</SelectItem>
          <SelectItem value="e-model">E-Model</SelectItem>
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Network</SelectLabel>
          <SelectItem value="circuit">Microcircuit</SelectItem>
          <SelectItem value="region">Region</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const Small: Story = {
  render: () => (
    <Select>
      <SelectTrigger size="sm" className="w-40">
        <SelectValue placeholder="Filter" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        <SelectItem value="mine">Mine</SelectItem>
        <SelectItem value="shared">Shared</SelectItem>
      </SelectContent>
    </Select>
  ),
};
