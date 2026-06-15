import { Button } from '@/ui/molecules/button';
import { EmptyMinimal, ErrorMinimal } from '@/ui/molecules/feedback-card';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/FeedbackCard',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const ErrorState: Story = {
  render: () => (
    <div className="w-[420px]">
      <ErrorMinimal
        tag="Error"
        title="Couldn't load the workspace"
        description="The server returned an error. Please retry or contact support if the problem persists."
        primaryAction={<Button size="sm">Retry</Button>}
        secondaryAction={
          <Button size="sm" variant="ghost">
            Contact support
          </Button>
        }
      />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="w-[420px]">
      <EmptyMinimal
        tag="Empty"
        title="No simulations yet"
        description="Create a simulation to see it listed here."
        primaryAction={<Button size="sm">New simulation</Button>}
      />
    </div>
  ),
};
