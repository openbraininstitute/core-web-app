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
    false,
    true,
  ])('tags a row of the current project (public %s) with the This project badge', (isPublic) => {
    renderCell({ authorized_project_id: 'current', authorized_public: isPublic });
    const mark = screen.getByTestId('project-ownership-mark');
    expect(mark.querySelector('[data-slot="badge"] svg')).toBeTruthy();
    expect(mark.textContent).toBe('This project');
  });

  it('labels a row of another project as quiet text, aligned with the badge text', () => {
    renderCell({ authorized_project_id: 'elsewhere', authorized_public: true });
    const mark = screen.getByTestId('project-ownership-mark');
    expect(mark.dataset.ownership).toBe('other');
    expect(mark.querySelector('svg')).toBeNull();
    // the same badge geometry, with an empty slot where the icon would be
    expect(mark.querySelector('[data-slot="badge"] > [aria-hidden="true"]')).toBeTruthy();
    expect(mark.textContent).toBe('Other project');
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
