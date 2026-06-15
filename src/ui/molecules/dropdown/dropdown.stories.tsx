import AccordionButton from '@/ui/molecules/dropdown';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/AccordionButton',
  component: AccordionButton,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof AccordionButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: <span className="font-semibold">Workspace details</span>,
    items: ['Workspace A', 'Workspace B', 'Workspace C'],
  },
  render: (args) => (
    <div className="w-[480px]">
      <AccordionButton {...args} />
    </div>
  ),
};

export const OpenByDefault: Story = {
  args: {
    label: <span className="font-semibold">Recent activity</span>,
    items: ['Simulation completed', 'Model imported', 'New collaborator added'],
    defaultOpen: true,
  },
  render: (args) => (
    <div className="w-[480px]">
      <AccordionButton {...args} />
    </div>
  ),
};

export const Active: Story = {
  args: {
    label: <span className="font-semibold">Selected workspace</span>,
    isActive: true,
    items: ['CA1 simulation', 'Thalamic loop'],
  },
  render: (args) => (
    <div className="w-[480px]">
      <AccordionButton {...args} />
    </div>
  ),
};

export const WithChildrenRender: Story = {
  args: {
    label: <span className="font-semibold">Recent activity</span>,
    defaultOpen: true,
  },
  render: (args) => (
    <div className="w-[480px]">
      <AccordionButton {...args}>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Simulation ca1-pyr-23 completed</span>
            <span className="text-neutral-4 text-xs">2m ago</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Loris added a new model</span>
            <span className="text-neutral-4 text-xs">1h ago</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Workspace shared with 3 collaborators</span>
            <span className="text-neutral-4 text-xs">yesterday</span>
          </div>
        </div>
      </AccordionButton>
    </div>
  ),
};

export const Stack: Story = {
  render: () => (
    <div className="flex w-[480px] flex-col gap-3">
      <AccordionButton
        label={<span className="font-semibold">Configuration</span>}
        items={['Solver: NEURON 8.2', 'Compartments: 4123', 'Channels: HH + Ca + Kv']}
      />
      <AccordionButton
        label={<span className="font-semibold">Inputs</span>}
        items={['Stimulus: step current', 'Duration: 1500 ms']}
      />
      <AccordionButton
        label={<span className="font-semibold">Outputs</span>}
        items={['Voltage trace', 'Spike count', 'F-I curve']}
      />
    </div>
  ),
};
