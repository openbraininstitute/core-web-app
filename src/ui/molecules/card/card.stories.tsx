import { Button } from '@/ui/molecules/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/molecules/card';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    borderless: { control: 'boolean' },
    shadowless: { control: 'boolean' },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <CardTitle>Workspace plan</CardTitle>
        <CardDescription>You're on the Free tier.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Upgrade to unlock larger compute quotas and team management.</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost">Cancel</Button>
        <Button>Upgrade</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Past 7 days</CardDescription>
        <CardAction>
          <Button size="sm" variant="ghost">
            View all
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm">
          <li>3 simulations completed</li>
          <li>1 model imported</li>
          <li>2 collaborators added</li>
        </ul>
      </CardContent>
    </Card>
  ),
};

export const Borderless: Story = {
  args: { borderless: true, shadowless: true },
  render: (args) => (
    <Card {...args} className="w-80 bg-neutral-1">
      <CardHeader>
        <CardTitle>Quiet surface</CardTitle>
        <CardDescription>No border, no shadow.</CardDescription>
      </CardHeader>
    </Card>
  ),
};
