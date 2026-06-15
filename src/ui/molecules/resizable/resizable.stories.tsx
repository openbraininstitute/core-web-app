import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/ui/molecules/resizable';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/Resizable',
  component: ResizablePanelGroup,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const Pane = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full items-center justify-center bg-neutral-1 text-sm">{children}</div>
);

export const Horizontal: Story = {
  render: () => (
    <div className="border-neutral-2 h-60 w-[640px] overflow-hidden rounded-md border">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30}>
          <Pane>Sidebar</Pane>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
          <Pane>Main content</Pane>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="border-neutral-2 h-80 w-[480px] overflow-hidden rounded-md border">
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel defaultSize={60}>
          <Pane>Top</Pane>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40}>
          <Pane>Bottom</Pane>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

export const ThreePanes: Story = {
  render: () => (
    <div className="border-neutral-2 h-60 w-[720px] overflow-hidden rounded-md border">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={20}>
          <Pane>Left</Pane>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>
          <Pane>Center</Pane>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={30}>
          <Pane>Right</Pane>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};
