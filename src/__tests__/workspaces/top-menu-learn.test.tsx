import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FlagsProvider } from '@/features/feature-flags';
import { defaultFlags } from '@/features/feature-flags/config';
import { TopMenuNavigation } from '@/ui/segments/workspaces/top-menu-nav';

const VLAB = '11111111-1111-1111-1111-111111111111';
const PROJECT = '22222222-2222-2222-2222-222222222222';
const base = `/app/virtual-lab/${VLAB}/${PROJECT}`;

vi.mock('next/navigation', () => ({
  usePathname: () => `${base}/learn`,
  useParams: () => ({ virtualLabId: VLAB, projectId: PROJECT }),
}));

// the menu's lab and membership queries are beside the point here
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQuery: () => ({ data: undefined }),
}));

function renderMenu(learn: boolean) {
  render(
    <FlagsProvider flags={{ ...defaultFlags, learn }}>
      <TopMenuNavigation />
    </FlagsProvider>
  );
}

describe('TopMenuNavigation / Learn', () => {
  it('shows Learn, after Home, while its flag is on', () => {
    renderMenu(true);
    const learn = screen.getByTestId('workspace-learn');
    expect(learn).toHaveAttribute('href', `${base}/learn`);
    expect(learn).toHaveClass('bg-primary-9');
    const ids = screen.getAllByRole('link').map((link) => link.getAttribute('data-testid'));
    expect(ids.indexOf('workspace-learn')).toBe(ids.indexOf('workspace-home') + 1);
  });

  it('leaves Learn out while its flag is off', () => {
    renderMenu(false);
    expect(screen.queryByTestId('workspace-learn')).toBeNull();
    expect(screen.getByTestId('workspace-explore-data')).toBeInTheDocument();
  });
});
