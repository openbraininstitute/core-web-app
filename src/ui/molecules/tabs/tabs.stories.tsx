import { PillTabs, PillTabsContent, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/PillTabs',
  component: PillTabs,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PillTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <PillTabs defaultValue="overview" className="w-[520px]">
      <PillTabsList>
        <PillTabsTrigger value="overview">Overview</PillTabsTrigger>
        <PillTabsTrigger value="analysis">Analysis</PillTabsTrigger>
        <PillTabsTrigger value="files">Files</PillTabsTrigger>
        <PillTabsTrigger value="logs">Logs</PillTabsTrigger>
      </PillTabsList>
      <PillTabsContent value="overview">Summary, metadata, owner info.</PillTabsContent>
      <PillTabsContent value="analysis">Plots and derived stats.</PillTabsContent>
      <PillTabsContent value="files">Raw simulation outputs.</PillTabsContent>
      <PillTabsContent value="logs">Solver logs and stderr.</PillTabsContent>
    </PillTabs>
  ),
};

export const Two: Story = {
  render: () => (
    <PillTabs defaultValue="me" className="w-[320px]">
      <PillTabsList>
        <PillTabsTrigger value="me">Me</PillTabsTrigger>
        <PillTabsTrigger value="team">Team</PillTabsTrigger>
      </PillTabsList>
      <PillTabsContent value="me">My simulations.</PillTabsContent>
      <PillTabsContent value="team">Shared with the team.</PillTabsContent>
    </PillTabs>
  ),
};
