import { useState } from 'react';

import { ListPagination } from '@/ui/molecules/list-pagination';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/ListPagination',
  component: ListPagination,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ListPagination>;

export default meta;
type Story = StoryObj<typeof meta>;

function Wrapper({ total }: { total: number }) {
  const [page, setPage] = useState(1);
  return <ListPagination current={page} pageSize={10} total={total} onChange={setPage} />;
}

export const SinglePage: Story = {
  render: () => <Wrapper total={8} />,
  parameters: {
    docs: { description: { story: 'Renders nothing when total ≤ pageSize.' } },
  },
};

export const SeveralPages: Story = { render: () => <Wrapper total={48} /> };

export const ManyPages: Story = { render: () => <Wrapper total={350} /> };
