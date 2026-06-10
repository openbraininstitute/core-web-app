import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// State the query is in is swapped per test; the data hooks are overridden and
// the leaf Tree/TreeSearch are stubbed so we test BrainRegionHierarchy's own
// "which state renders which UI" logic without standing up the whole tree.
const query = vi.hoisted(() => ({
  value: { result: null as unknown, loading: false } as { result: unknown; loading: boolean },
}));

vi.mock('@/features/brain-region-hierarchy/context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/brain-region-hierarchy/context')>()),
  usePrimaryExtendedHierarchySpeciesQuery: () => query.value,
}));
vi.mock('@/features/brain-region-hierarchy/hooks', () => ({
  useWorkspaceHierarchyRegistry: () => ({
    changeBrainRegion: vi.fn(),
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
vi.mock('@/components/tree', () => ({ Tree: () => <div data-testid="tree" /> }));
vi.mock('@/components/tree/elements/search', () => ({
  TreeSearch: () => <div data-testid="tree-search" />,
}));

import { BrainRegionHierarchy } from '@/features/brain-region-hierarchy';

describe('BrainRegionHierarchy (tree view)', () => {
  beforeEach(() => {
    query.value = { result: null, loading: false };
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
    query.value = {
      loading: false,
      result: {
        options: [{ value: 'br-cortex', label: 'Cortex', data: { id: 'br-cortex' } }],
        nodes: { id: 'br-cortex', name: 'Cortex', children: [] },
      },
    };
    render(<BrainRegionHierarchy dataKey="test" />);

    expect(screen.getByTestId('tree-search')).toBeInTheDocument();
    expect(screen.getByTestId('tree')).toBeInTheDocument();
  });
});
