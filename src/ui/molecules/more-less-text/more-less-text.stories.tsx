import { ExpandableText } from '@/ui/molecules/more-less-text';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const LOREM =
  'The brain is the most complex object in the known universe. It contains roughly 86 billion neurons and trillions of synaptic connections. Decades of experimental work have mapped circuits at multiple scales — from single channels to whole regions. Building a unified model that reconciles these scales is one of the grand challenges of modern science. Today we have the computational tools to simulate networks of thousands of biologically detailed neurons, replay realistic stimulus protocols, and compare the output against experimental recordings. The Open Brain Institute is working to make this kind of in silico experimentation accessible to any researcher.';

const meta = {
  title: 'Molecules/ExpandableText',
  component: ExpandableText,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { text: LOREM, collapsedLines: 3 },
  argTypes: {
    collapsedLines: { control: { type: 'number', min: 1, max: 8 } },
  },
} satisfies Meta<typeof ExpandableText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-[480px]">
      <ExpandableText {...args}>
        {({ isExpanded, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            className="text-primary-7 text-sm font-medium hover:underline"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </ExpandableText>
    </div>
  ),
};

export const ShortContent: Story = {
  args: { text: 'Not enough to overflow.', collapsedLines: 3 },
  render: (args) => (
    <div className="w-[480px]">
      <ExpandableText {...args}>
        {({ isExpanded, toggle }) => (
          <button type="button" onClick={toggle}>
            {isExpanded ? 'Less' : 'More'}
          </button>
        )}
      </ExpandableText>
    </div>
  ),
};
