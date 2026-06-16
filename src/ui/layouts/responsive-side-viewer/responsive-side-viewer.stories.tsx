import { ResponsiveSideViewer } from '@/ui/layouts/responsive-side-viewer';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Layouts/ResponsiveSideViewer',
  component: ResponsiveSideViewer,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ResponsiveSideViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="h-[480px]">
      <ResponsiveSideViewer>
        <div className="bg-neutral-1 p-6">
          <h2 className="text-lg font-semibold">Content</h2>
          <p className="text-neutral-4 mt-2 text-sm">
            Left side: scrollable content / form / configuration.
          </p>
        </div>
        <div className="bg-primary-9 flex items-center justify-center text-white">
          Viewer (right side)
        </div>
      </ResponsiveSideViewer>
    </div>
  ),
};
