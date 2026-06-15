import Tabs, { Tab } from '@/ui/molecules/tabbed-page';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/TabbedPage',
  component: Tabs,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[640px]">
      <Tabs defaultMessage="Nothing to show.">
        <Tab label="Overview">
          <p className="text-sm">Overview content lives here.</p>
        </Tab>
        <Tab label="Analysis">
          <p className="text-sm">Analysis content lives here.</p>
        </Tab>
        <Tab label="Logs">
          <p className="text-sm">Logs content lives here.</p>
        </Tab>
      </Tabs>
    </div>
  ),
};

export const Two: Story = {
  render: () => (
    <div className="w-[480px]">
      <Tabs defaultMessage="Nothing to show.">
        <Tab label="Me">
          <p className="text-sm">Personal view.</p>
        </Tab>
        <Tab label="Team">
          <p className="text-sm">Shared view.</p>
        </Tab>
      </Tabs>
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="w-[480px]">
      <Tabs defaultMessage="No tabs available right now." />
    </div>
  ),
};
