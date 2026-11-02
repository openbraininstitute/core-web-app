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

/** The menu, with the flags given switched on or off over their defaults. */
function renderMenu(flags: Record<string, boolean> = {}) {
  render(
    <FlagsProvider flags={{ ...defaultFlags, ...flags }}>
      <TopMenuNavigation />
    </FlagsProvider>
  );
}

describe('TopMenuNavigation / Learn', () => {
  it('shows Learn, after Home, while its flag is on', () => {
    renderMenu({ learn: true });
    const learn = screen.getByTestId('workspace-learn');
    expect(learn).toHaveAttribute('href', `${base}/learn`);
    expect(learn).toHaveClass('bg-primary-9');
    const ids = screen.getAllByRole('link').map((link) => link.getAttribute('data-testid'));
    expect(ids.indexOf('workspace-learn')).toBe(ids.indexOf('workspace-home') + 1);
  });

  it('leaves Learn out by default: its flag is off unless switched on', () => {
    renderMenu();
    expect(screen.queryByTestId('workspace-learn')).toBeNull();
    expect(screen.getByTestId('workspace-explore-data')).toBeInTheDocument();
  });
});

describe('TopMenuNavigation / hide-help', () => {
  it('keeps Help by default, with Learn on or off', () => {
    renderMenu();
    expect(screen.getByTestId('workspace-help')).toBeInTheDocument();
  });

  it('keeps Help with Learn on', () => {
    renderMenu({ learn: true });
    expect(screen.getByTestId('workspace-help')).toBeInTheDocument();
  });

  it('hides Help with its flag on', () => {
    renderMenu({ 'hide-help': true });
    expect(screen.queryByTestId('workspace-help')).toBeNull();
  });
});

describe('TopMenuNavigation / grey-menu-pills', () => {
  it('keeps the links white, as on main, while its flag is off', () => {
    renderMenu({ learn: true });
    for (const id of ['workspace-explore-data', 'workspace-help']) {
      expect(screen.getByTestId(id)).toHaveClass('bg-white');
      expect(screen.getByTestId(id)).not.toHaveClass('bg-background');
    }
  });

  it("puts them on the page's grey with its flag on", () => {
    renderMenu({ learn: true, 'grey-menu-pills': true });
    for (const id of ['workspace-explore-data', 'workspace-help']) {
      expect(screen.getByTestId(id)).toHaveClass('bg-background');
      expect(screen.getByTestId(id)).not.toHaveClass('bg-white');
    }
    // the active one stays navy
    expect(screen.getByTestId('workspace-learn')).toHaveClass('bg-primary-9');
  });
});
