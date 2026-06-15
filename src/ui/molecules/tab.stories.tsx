import Tab from '@/ui/molecules/tab';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Tab (legacy nav)',
  component: Tab,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Pill-shaped navigation row used in legacy side menus. New code should compose `PillTabs` or `TabbedPage` instead.',
      },
    },
  },
} satisfies Meta<typeof Tab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inactive: Story = {
  args: { href: '#', highlight: false, children: 'Workspaces' },
  render: (args) => (
    <div className="w-[420px]">
      <Tab {...args} />
    </div>
  ),
};

export const Highlighted: Story = {
  args: { href: '#', highlight: true, children: 'Current workspace' },
  render: (args) => (
    <div className="w-[420px]">
      <Tab {...args} />
    </div>
  ),
};

export const Stacked: Story = {
  render: () => (
    <div className="flex w-[420px] flex-col gap-2">
      <Tab href="#" highlight>
        Workspaces
      </Tab>
      <Tab href="#" highlight={false}>
        Notebooks
      </Tab>
      <Tab href="#" highlight={false}>
        Reports
      </Tab>
    </div>
  ),
};
