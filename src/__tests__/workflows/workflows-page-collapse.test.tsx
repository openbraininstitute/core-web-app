import { act, fireEvent, render, screen } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';

import Page from '@/app/app/virtual-lab/[virtualLabId]/[projectId]/workflows/page';

import type { ComponentProps } from 'react';

vi.mock('@bprogress/next', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({}),
}));
vi.mock('@/ui/hooks/use-disable-element-overflow', () => ({
  useDisableElementOverflow: () => {},
}));
vi.mock('@/ui/segments/app-setup/discover-app', () => ({
  useNextStepOnboarding: () => {},
  workflowTour: {},
}));
// Rows gone at once, with no exit to wait for.
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: ComponentProps<'div'> & Record<string, unknown>) => <div {...props} />,
  },
}));
vi.mock('@/ui/segments/workflows/elements/category-menu', async () => {
  const { MenuItem } = await import('@/ui/segments/workflows/elements/menu-item');
  return {
    CategoryMenu: ({
      current,
      onItemClick,
    }: {
      current: string | null;
      onItemClick: (value: string | null) => void;
    }) => (
      <>
        <MenuItem
          testId="card"
          title={`lit: ${current}`}
          value="simulate"
          disabled={false}
          active={current !== null}
          onClick={onItemClick}
        />
        <MenuItem
          testId="disabled-card"
          title="Coming soon"
          value={null}
          disabled
          active={false}
          onClick={onItemClick}
        />
        <button type="button" data-testid="carousel-button" />
        <h1 data-testid="heading">Category</h1>
      </>
    ),
  };
});
vi.mock('@/ui/segments/workflows/elements/types-menu', () => ({
  TypesMenu: () => <div data-testid="types" />,
}));
vi.mock('@/ui/segments/workflows/elements/workflow-activity', () => ({
  WorkflowActivity: () => <input aria-label="search" />,
}));

async function page() {
  const params = Promise.resolve({ virtualLabId: 'v', projectId: 'p' });
  await act(async () => {
    render(
      <NuqsTestingAdapter searchParams="?activity=simulate">
        <Suspense>
          <Page params={params} searchParams={Promise.resolve(null)} />
        </Suspense>
      </NuqsTestingAdapter>
    );
  });
  expect(screen.getByTestId('types')).toBeInTheDocument();
}

async function expectCollapsed() {
  expect(await screen.findByText('lit: null')).toBeInTheDocument();
  expect(screen.queryByTestId('types')).toBeNull();
}
async function expectOpen() {
  await act(async () => {});
  expect(screen.getByTestId('types')).toBeInTheDocument();
  expect(screen.getByTestId('card')).toHaveTextContent('lit: simulate');
}

describe('the workflows page’s top window', () => {
  it('deselects the category and shuts the Type row on a click on its lit card', async () => {
    await page();

    fireEvent.click(screen.getByTestId('card'));

    await expectCollapsed();
  });

  it('takes the keyboard as it takes a click, a disabled card taking neither', async () => {
    await page();
    expect(screen.getByTestId('disabled-card')).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(screen.getByTestId('disabled-card'), { key: 'Enter' });
    await expectOpen();

    screen.getByTestId('card').focus();
    expect(screen.getByTestId('card')).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('card'), { key: 'Enter' });
    await expectCollapsed();

    fireEvent.keyDown(screen.getByTestId('card'), { key: ' ' });
    expect(await screen.findByText('lit: simulate')).toBeInTheDocument();
  });

  it('stays through a click on its white space, a heading, a disabled card or a button', async () => {
    await page();

    fireEvent.click(screen.getByTestId('workflow-scrollable-selector'));
    fireEvent.click(screen.getByTestId('heading'));
    fireEvent.click(screen.getByTestId('disabled-card'));
    fireEvent.click(screen.getByTestId('carousel-button'));

    await expectOpen();
  });

  it('is left alone by the table, under the pointer or in use', async () => {
    await page();

    fireEvent.pointerEnter(screen.getByTestId('workflow-activity-content'));
    fireEvent.focus(screen.getByLabelText('search'));
    fireEvent.keyDown(screen.getByLabelText('search'), { key: 'a' });
    fireEvent.click(screen.getByLabelText('search'));

    await expectOpen();
  });

  it('opens again on a click on a category', async () => {
    await page();
    fireEvent.click(screen.getByTestId('card'));
    await expectCollapsed();

    fireEvent.click(screen.getByTestId('card'));

    expect(await screen.findByText('lit: simulate')).toBeInTheDocument();
    expect(screen.getByTestId('types')).toBeInTheDocument();
  });
});
