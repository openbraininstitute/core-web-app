import { fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The query state is swapped per test; the data hooks are overridden and the
// leaf Tree/TreeSearch are stubbed so we test BrainRegionHierarchy's own
// "which state renders which UI" logic without standing up the whole tree.
const query = vi.hoisted(() => ({
  value: { result: null as unknown, loading: false } as { result: unknown; loading: boolean },
}));
const reg = vi.hoisted(() => ({ changeBrainRegion: vi.fn() }));

vi.mock('@/features/brain-region-hierarchy/context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/brain-region-hierarchy/context')>()),
  usePrimaryExtendedHierarchySpeciesQuery: () => query.value,
}));
vi.mock('@/features/brain-region-hierarchy/hooks', () => ({
  useWorkspaceHierarchyRegistry: () => ({
    changeBrainRegion: reg.changeBrainRegion,
    selectedBrainRegion: null,
    workspaceHierarchyId: 'h-mouse',
  }),
}));
vi.mock(
  '@/features/brain-region-hierarchy/hooks/use-brain-region-species',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('@/features/brain-region-hierarchy/hooks/use-brain-region-species')
    >()),
    useHierarchyRuntimeMetadataQuery: () => ({ runtimeHierarchyById: new Map() }),
  })
);
vi.mock('@/components/tree', () => ({
  // a clickable stand-in so we can exercise the node-click handler
  Tree: ({ onClick }: { onClick?: (node: unknown) => void }) => (
    <button
      type="button"
      data-testid="tree"
      onClick={() => onClick?.({ id: 'br-cortex', name: 'cortex' })}
    />
  ),
}));
vi.mock('@/components/tree/elements/search', () => ({
  TreeSearch: () => <div data-testid="tree-search" />,
}));

import { BrainRegionHierarchy } from '@/features/brain-region-hierarchy';
import { brainRegionSidebarAtom } from '@/features/brain-region-hierarchy/context';

const withData = {
  loading: false,
  result: {
    options: [{ value: 'br-cortex', label: 'Cortex', data: { id: 'br-cortex' } }],
    nodes: { id: 'br-cortex', name: 'Cortex', children: [] },
  },
};

describe('BrainRegionHierarchy (tree view)', () => {
  beforeEach(() => {
    query.value = { result: null, loading: false };
    reg.changeBrainRegion.mockClear();
  });

  it('shows a spinner while the hierarchy is loading', () => {
    query.value = { result: null, loading: true };
    const { container } = render(<BrainRegionHierarchy dataKey="test" />);

    expect(container.querySelector('.anticon-loading')).not.toBeNull();
  });

  it('shows a fallback message when the hierarchy could not be resolved', () => {
    query.value = { result: null, loading: false };
    render(<BrainRegionHierarchy dataKey="test" />);

    expect(screen.getByText(/target node was not found/i)).toBeInTheDocument();
  });

  it('renders the search box and the tree once the hierarchy has loaded', () => {
    query.value = withData;
    render(<BrainRegionHierarchy dataKey="test" />);

    expect(screen.getByTestId('tree-search')).toBeInTheDocument();
    expect(screen.getByTestId('tree')).toBeInTheDocument();
  });

  it('renders only the search box when the hierarchy has no tree nodes', () => {
    query.value = { loading: false, result: { ...withData.result, nodes: null } };
    render(<BrainRegionHierarchy dataKey="test" />);

    expect(screen.getByTestId('tree-search')).toBeInTheDocument();
    expect(screen.queryByTestId('tree')).not.toBeInTheDocument();
  });

  it('collapses the panel when the sidebar is collapsed', () => {
    query.value = withData;
    const store = createStore();
    store.set(brainRegionSidebarAtom, true);

    const { container } = render(
      <Provider store={store}>
        <BrainRegionHierarchy dataKey="test" />
      </Provider>
    );

    expect(container.querySelector('.collapsed')).not.toBeNull();
  });

  it('selects the clicked node and forwards it to the click callback', () => {
    query.value = withData;
    const onClickCallback = vi.fn();
    render(<BrainRegionHierarchy dataKey="test" onClickCallback={onClickCallback} />);

    fireEvent.click(screen.getByTestId('tree'));

    expect(reg.changeBrainRegion).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'br-cortex' })
    );
    expect(onClickCallback).toHaveBeenCalledWith(expect.objectContaining({ id: 'br-cortex' }));
  });
});
