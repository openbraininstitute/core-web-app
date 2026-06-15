import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { AsyncSelect } from '@/ui/molecules/async-select';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/AsyncSelect',
  component: AsyncSelect,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Async paginated select built on react-query. Stories wrap a fresh QueryClient so they run in isolation.',
      },
    },
  },
} satisfies Meta<typeof AsyncSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

type Item = { id: string; name: string };

const FIXTURES: Item[] = Array.from({ length: 73 }, (_, i) => ({
  id: `id_${i + 1}`,
  name: `Region ${i + 1}`,
}));

async function fakeFetch({
  filters,
}: {
  filters: { page?: number; page_size?: number; name?: string };
}) {
  const page = filters.page ?? 1;
  const pageSize = filters.page_size ?? 10;
  const filtered = filters.name
    ? FIXTURES.filter((f) => f.name.toLowerCase().includes(String(filters.name).toLowerCase()))
    : FIXTURES;
  await new Promise((r) => setTimeout(r, 200));
  return {
    data: filtered.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, page_size: pageSize, total_items: filtered.length },
  };
}

function Wrapper({ searchable }: { searchable: boolean }) {
  const [value, setValue] = useState<string | undefined>(undefined);
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <div className="w-72">
        <AsyncSelect
          dataKey={['storybook-regions']}
          // biome-ignore lint/suspicious/noExplicitAny: simplified for story
          queryFn={fakeFetch as any}
          getOptionLabel={(item) => (item as Item).name}
          getOptionValue={(item) => (item as Item).id}
          searchField="name"
          searchable={searchable}
          selectedValue={value}
          onSelect={(opt) => setValue(opt?.value)}
          placeholder="Pick a region"
          searchPlaceholder="Search…"
          tooltip={null}
          customItemRender={null}
        />
      </div>
    </QueryClientProvider>
  );
}

export const Default: Story = { render: () => <Wrapper searchable={false} /> };

export const Searchable: Story = { render: () => <Wrapper searchable /> };

function Preselected() {
  const [value, setValue] = useState<string | undefined>('id_5');
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <div className="w-72">
        <AsyncSelect
          dataKey={['storybook-regions-preselected']}
          // biome-ignore lint/suspicious/noExplicitAny: simplified for story
          queryFn={fakeFetch as any}
          getOptionLabel={(item) => (item as Item).name}
          getOptionValue={(item) => (item as Item).id}
          searchField="name"
          searchable
          selectedValue={value}
          onSelect={(opt) => setValue(opt?.value)}
          placeholder="Pick a region"
          tooltip={null}
          customItemRender={null}
        />
      </div>
    </QueryClientProvider>
  );
}

export const Preselected_: Story = {
  name: 'Preselected',
  render: () => <Preselected />,
  parameters: {
    docs: {
      description: {
        story:
          'Selected option is fetched from the persisted cache so the trigger label resolves even before the page that contains it has loaded.',
      },
    },
  },
};
