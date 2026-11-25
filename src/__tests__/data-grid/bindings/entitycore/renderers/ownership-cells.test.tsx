import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ProjectOwnershipCell,
  VisibilityCell,
} from '@/features/data-grid/bindings/entitycore/renderers/ownership-cells';
import { TooltipProvider } from '@/ui/molecules/tooltip';

import type { EntityAuthorization } from '@/api/entitycore/types/shared/global';
import type { ICellRendererProps } from '@/features/data-grid/react';

vi.mock('@/ui/hooks/use-workspace', () => ({ useWorkspace: () => ({ projectId: 'current' }) }));

type TRow = { authorized_project_id?: string | null; authorized_public?: boolean | null };

function renderCell(row: TRow | undefined, Cell = ProjectOwnershipCell) {
  const props = { row } as ICellRendererProps<Partial<EntityAuthorization>>;
  return render(
    <TooltipProvider>
      <Cell {...props} />
    </TooltipProvider>
  );
}

describe('ProjectOwnershipCell', () => {
  it('shows the This project badge on a private row of the current project', () => {
    renderCell({ authorized_project_id: 'current', authorized_public: false });
    const mark = screen.getByRole('img', { name: 'This project · Private' });
    expect(mark.textContent).toBe('This project');
    expect(mark.dataset).toMatchObject({ ownership: 'current', visibility: 'private' });
    expect(screen.queryByTestId('project-ownership-made-public')).toBeNull();
  });

  it('adds a globe after the badge when the current project made the row public', () => {
    renderCell({ authorized_project_id: 'current', authorized_public: true });
    const mark = screen.getByRole('img', { name: 'This project · Public' });
    expect(mark.textContent).toBe('This project');
    expect(mark.dataset).toMatchObject({ ownership: 'current', visibility: 'public' });
    expect(screen.getByTestId('project-ownership-made-public')).toBeTruthy();
  });

  it('shows the Other projects badge on a public row of another project', () => {
    renderCell({ authorized_project_id: 'elsewhere', authorized_public: true });
    const mark = screen.getByRole('img', { name: 'Other projects · Public' });
    expect(mark.textContent).toBe('Other projects');
    expect(mark.dataset).toMatchObject({ ownership: 'other', visibility: 'public' });
    expect(screen.queryByTestId('project-ownership-made-public')).toBeNull();
  });

  it('shows the empty placeholder when the row is neither ours nor public', () => {
    renderCell({ authorized_project_id: null, authorized_public: null });
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('—')).toBeTruthy();
  });
});

describe('VisibilityCell', () => {
  it.each([
    [true, 'public', 'Public'],
    [false, 'private', 'Private'],
  ])('authorized_public %s shows the %s badge', (isPublic, visibility, label) => {
    renderCell({ authorized_public: isPublic }, VisibilityCell);
    const mark = screen.getByTestId('visibility-mark');
    expect(mark.dataset.visibility).toBe(visibility);
    expect(mark.querySelector('[data-slot="badge"] svg')).toBeTruthy();
    expect(mark.textContent).toBe(label);
  });

  it('shows the empty placeholder without a visibility', () => {
    renderCell({ authorized_public: null }, VisibilityCell);
    expect(screen.queryByTestId('visibility-mark')).toBeNull();
    expect(screen.getByText('—')).toBeTruthy();
  });
});
