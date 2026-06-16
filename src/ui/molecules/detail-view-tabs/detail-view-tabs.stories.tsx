import { NuqsTestingAdapter } from 'nuqs/adapters/testing';

import DetailViewTabs from '@/ui/molecules/detail-view-tabs';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/DetailViewTabs',
  component: DetailViewTabs,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <NuqsTestingAdapter searchParams="?tab=overview">
        <Story />
      </NuqsTestingAdapter>
    ),
  ],
} satisfies Meta<typeof DetailViewTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Three: Story = {
  render: () => (
    <div className="w-[640px]">
      <DetailViewTabs
        tabKey="tab"
        defaultKey="overview"
        tabsConfig={[
          { key: 'overview', title: 'Overview' },
          { key: 'analysis', title: 'Analysis' },
          { key: 'logs', title: 'Logs' },
        ]}
      />
    </div>
  ),
};
