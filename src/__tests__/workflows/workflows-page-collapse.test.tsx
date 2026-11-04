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
          title={`picked: ${current}`}
          value={current}
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

function expectCollapsed() {
  expect(screen.queryByTestId('types')).toBeNull();
  expect(screen.getByTestId('card')).toHaveTextContent('picked: simulate');
}
function expectOpen() {
  expect(screen.getByTestId('types')).toBeInTheDocument();
  expect(screen.getByTestId('card')).toHaveTextContent('picked: simulate');
}

describe('the workflows page’s Type row', () => {
  it('shuts on a click on the top window’s white space, the category staying picked', async () => {
    await page();

    fireEvent.click(screen.getByTestId('workflow-scrollable-selector'));

    expectCollapsed();
  });

  it('shuts on a click on a heading, which is no control', async () => {
    await page();

    fireEvent.click(screen.getByTestId('heading'));

    expectCollapsed();
  });

  it('stays through a click on a card, a disabled one or a button', async () => {
    await page();

    fireEvent.click(screen.getByTestId('card'));
    fireEvent.click(screen.getByTestId('disabled-card'));
    fireEvent.click(screen.getByTestId('carousel-button'));

    expectOpen();
  });

  it('shuts as the pointer comes over the table, the category staying picked', async () => {
    await page();

    fireEvent.pointerEnter(screen.getByTestId('workflow-activity-content'));

    expectCollapsed();
  });

  it('shuts on typing in the table', async () => {
    await page();

    fireEvent.keyDown(screen.getByLabelText('search'), { key: 'a' });

    expectCollapsed();
  });

  it('stays while the table takes focus of itself, as its search box does on mounting', async () => {
    await page();

    fireEvent.focus(screen.getByLabelText('search'));

    expectOpen();
  });

  it('opens again on a click on the category', async () => {
    await page();
    fireEvent.pointerEnter(screen.getByTestId('workflow-activity-content'));
    expectCollapsed();

    await act(async () => {
      fireEvent.click(screen.getByTestId('card'));
    });

    expectOpen();
  });
});
