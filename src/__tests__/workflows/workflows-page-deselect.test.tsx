import { act, fireEvent, render, screen } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';

import Page from '@/app/app/virtual-lab/[virtualLabId]/[projectId]/workflows/page';

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
vi.mock('@/ui/segments/workflows/elements/category-menu', async () => {
  const { MenuItem } = await import('@/ui/segments/workflows/elements/menu-item');
  return {
    CategoryMenu: ({ current }: { current: string | null }) => (
      <>
        <MenuItem
          testId="card"
          title={current ?? 'nothing picked'}
          value={null}
          disabled={false}
          active={false}
          onClick={() => {}}
        />
        <MenuItem
          testId="disabled-card"
          title="Coming soon"
          value={null}
          disabled
          active={false}
          onClick={() => {}}
        />
        <button type="button" data-testid="carousel-button" />
        <h1 data-testid="heading">Category</h1>
      </>
    ),
  };
});
vi.mock('@/ui/segments/workflows/elements/types-menu', () => ({ TypesMenu: () => null }));
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
  expect(screen.getByTestId('card')).toHaveTextContent('simulate');
}

const deselected = () => screen.findByText('nothing picked');
const stillPicked = async () => {
  await act(async () => {});
  expect(screen.getByTestId('card')).toHaveTextContent('simulate');
};

describe('the workflows page’s category', () => {
  it('is deselected by a click on the top window’s white space', async () => {
    await page();

    fireEvent.click(screen.getByTestId('workflow-scrollable-selector'));

    expect(await deselected()).toBeInTheDocument();
  });

  it('is deselected by a click on a heading, which is no control', async () => {
    await page();

    fireEvent.click(screen.getByTestId('heading'));

    expect(await deselected()).toBeInTheDocument();
  });

  it('stays through a click on a card, a disabled one or a button', async () => {
    await page();

    fireEvent.click(screen.getByTestId('card'));
    fireEvent.click(screen.getByTestId('disabled-card'));
    fireEvent.click(screen.getByTestId('carousel-button'));

    await stillPicked();
  });

  it('is deselected by the pointer coming over the table', async () => {
    await page();

    fireEvent.pointerEnter(screen.getByTestId('workflow-activity-content'));

    expect(await deselected()).toBeInTheDocument();
  });

  it('is deselected by typing in the table', async () => {
    await page();

    fireEvent.keyDown(screen.getByLabelText('search'), { key: 'a' });

    expect(await deselected()).toBeInTheDocument();
  });

  it('stays while the table takes focus of itself, as its search box does on mounting', async () => {
    await page();

    fireEvent.focus(screen.getByLabelText('search'));

    await stillPicked();
  });
});
