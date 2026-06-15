import { Button } from '@/ui/molecules/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Open menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem>
          New file <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          Rename <DropdownMenuShortcut>F2</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const WithCheckboxes: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Columns</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Show columns</DropdownMenuLabel>
        <DropdownMenuCheckboxItem checked>Name</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked>Region</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem>Owner</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem>Created</DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const WithRadio: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Sort</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value="name">
          <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="created">Created</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="modified">Modified</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const Nested: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">More</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Open</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Workspace A</DropdownMenuItem>
            <DropdownMenuItem>Workspace B</DropdownMenuItem>
            <DropdownMenuItem>Workspace C</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
