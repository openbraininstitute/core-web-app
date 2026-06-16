import { ErrorComponent } from '@/ui/molecules/error-fallback';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/ErrorFallback',
  component: ErrorComponent,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ErrorComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FromError: Story = {
  render: () => (
    <div className="h-[400px]">
      <ErrorComponent
        error={new Error('Workspace failed to load: GET /api/workspaces returned 503')}
      />
    </div>
  ),
};

export const CustomMessage: Story = {
  render: () => (
    <div className="h-[400px]">
      <ErrorComponent customError="The simulation is taking longer than expected. Try again or contact support." />
    </div>
  ),
};

export const CustomHome: Story = {
  render: () => (
    <div className="h-[400px]">
      <ErrorComponent
        error={new Error('Workspace deleted')}
        homeHref="/app/virtual-lab/sync"
        homeLabel="Back to workspaces"
      />
    </div>
  ),
};

export const NoButtons: Story = {
  render: () => (
    <div className="h-[400px]">
      <ErrorComponent error={new Error('Read-only state')} showButtons={false} />
    </div>
  ),
};
