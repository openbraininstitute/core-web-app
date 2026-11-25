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
  it.each([
    ['current', false, 'current', 'This project'],
    ['current', true, 'current', 'This project'],
    ['elsewhere', true, 'other', 'Other projects'],
  ])('row of %s (public %s) shows the %s badge, whatever its visibility', (owner, isPublic, ownership, label) => {
    renderCell({ authorized_project_id: owner, authorized_public: isPublic });
    const mark = screen.getByTestId('project-ownership-mark');
    expect(mark.dataset.ownership).toBe(ownership);
    expect(mark.querySelector('[data-slot="badge"] svg')).toBeTruthy();
    expect(mark.textContent).toBe(label);
  });

  it('shows the empty placeholder without an owning project', () => {
    renderCell({ authorized_project_id: null, authorized_public: true });
    expect(screen.queryByTestId('project-ownership-mark')).toBeNull();
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
