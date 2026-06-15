import { Explanation } from '@/ui/molecules/explanation';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Explanation',
  component: Explanation,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Explanation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
  args: {
    title: 'How the firing rate is computed',
    hasDescription: true,
    children: (
      <p className="text-sm leading-relaxed">
        Firing rate is computed as the number of spikes detected in a sliding window divided by the
        window duration. The default window is 100ms.
      </p>
    ),
  },
};

export const WithoutDescription: Story = {
  args: {
    title: 'No further details available',
    hasDescription: false,
  },
};
