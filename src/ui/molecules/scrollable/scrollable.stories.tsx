import { ScrollableList } from '@/ui/molecules/scrollable';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/ScrollableList',
  component: ScrollableList,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ScrollableList>;

export default meta;
type Story = StoryObj<typeof meta>;

function Items({ count }: { count: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="border-neutral-2 flex h-11 items-center rounded-md border bg-white px-3 text-sm"
        >
          Item #{i + 1}
        </li>
      ))}
    </ul>
  );
}

export const Default: Story = {
  args: { itemCount: 12, visibleItemCount: 5 },
  render: (args) => (
    <div className="w-72">
      <ScrollableList {...args}>
        <Items count={args.itemCount} />
      </ScrollableList>
    </div>
  ),
};

export const ShortList: Story = {
  args: { itemCount: 3, visibleItemCount: 5 },
  render: (args) => (
    <div className="w-72">
      <ScrollableList {...args}>
        <Items count={args.itemCount} />
      </ScrollableList>
    </div>
  ),
};
