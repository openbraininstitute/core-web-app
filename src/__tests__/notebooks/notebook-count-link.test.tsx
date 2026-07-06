import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useNotebookCountMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/notebooks/hooks/use-notebook-count', () => ({
  useNotebookCount: () => useNotebookCountMock(),
}));

// next/link needs the app-router context in isolation; render a plain anchor instead.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname: string };
    children: React.ReactNode;
  }) => (
    <a href={typeof href === 'string' ? href : href.pathname} {...rest}>
      {children}
    </a>
  ),
}));

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope } from '@/constants';
import { NotebookCountLink } from '@/features/notebooks/components/notebook-count-link';

const TEMPLATE = ExtendedEntitiesTypeDict.AnalysisNotebookTemplate;

describe('NotebookCountLink', () => {
  it('renders "filtered of total" with count data attributes when active', () => {
    useNotebookCountMock.mockReturnValue({ filtered: 3, total: 12, isLoading: false });

    render(
      <NotebookCountLink
        title="Notebooks"
        extendedType={TEMPLATE}
        href="/notebooks/browse/analysis-notebook-template?scope=public"
        scope={WorkspaceScope.Public}
        isActive
      />
    );

    expect(screen.getByText('Notebooks')).toBeInTheDocument();
    const count = screen.getByTestId(`notebook-count-${TEMPLATE}`);
    expect(count).toHaveAttribute('data-count', '3');
    expect(count).toHaveAttribute('data-total', '12');
    expect(count).toHaveAttribute('data-active', 'true');
    expect(count).toHaveTextContent('3of12');
    expect(screen.getByTestId(`notebook-count-link-${TEMPLATE}`)).toHaveAttribute(
      'href',
      '/notebooks/browse/analysis-notebook-template?scope=public'
    );
  });

  it('falls back to 0 while counts are unresolved', () => {
    useNotebookCountMock.mockReturnValue({
      filtered: undefined,
      total: undefined,
      isLoading: false,
    });

    render(
      <NotebookCountLink
        title="Results"
        extendedType={ExtendedEntitiesTypeDict.AnalysisNotebookResult}
        href="/x"
        scope={WorkspaceScope.Public}
        isActive={false}
      />
    );

    const count = screen.getByTestId(
      `notebook-count-${ExtendedEntitiesTypeDict.AnalysisNotebookResult}`
    );
    expect(count).toHaveTextContent('0of0');
    expect(count).toHaveAttribute('data-active', 'false');
  });
});
