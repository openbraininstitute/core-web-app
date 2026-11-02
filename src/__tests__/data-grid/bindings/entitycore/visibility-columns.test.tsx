import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceSection } from '@/constants';
import { buildCellRenderers } from '@/features/data-grid/bindings/entitycore/cell-renderers';
import {
  editableColumn,
  visibilityColumn,
  withVisibilityColumns,
} from '@/features/data-grid/bindings/entitycore/columns/visibility';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import { EditableCell } from '@/features/data-grid/bindings/entitycore/renderers/editable-cell';
import { EditableHeader } from '@/features/data-grid/bindings/entitycore/renderers/editable-header';
import { VisibilityCell } from '@/features/data-grid/bindings/entitycore/renderers/visibility-cell';
import { resolveColumns } from '@/features/data-grid/core';
import { defaultFlags } from '@/features/feature-flags/config';
import { FlagsProvider } from '@/features/feature-flags/provider';

import type { ReactElement } from 'react';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'lab', projectId: 'p1' }),
}));

const renderWithFlags = (ui: ReactElement) =>
  render(<FlagsProvider flags={defaultFlags}>{ui}</FlagsProvider>);

function morphology() {
  const definition = getEntityGridDefinition('cell_morphology');
  if (!definition) throw new Error('no registered grid definition for cell_morphology');
  return definition;
}

describe('visibility and editable columns', () => {
  it('lead the listing, in that order', () => {
    const { schema } = withVisibilityColumns(morphology());
    const resolved = resolveColumns(schema, {
      dataType: 'cell_morphology',
      section: WorkspaceSection.Data,
    });
    expect(resolved.slice(0, 2).map((c) => c.id)).toEqual(['visibility', 'editable']);
  });

  it('leaves the registered definition alone', () => {
    expect(morphology().schema.columns.some((c) => c.id === 'visibility')).toBe(false);
    expect(withVisibilityColumns(morphology())).toBe(withVisibilityColumns(morphology()));
  });

  it('filters on the bare authorized_public param', () => {
    const { filter } = visibilityColumn();
    expect(filter?.field).toBe('authorized_public');
    expect(editableColumn().filter?.field).toBe('authorized_project_id');
  });

  it('has its renderers registered', () => {
    const registry = buildCellRenderers(morphology());
    expect(registry.get('visibility')).toBe(VisibilityCell);
    expect(registry.get('editable')).toBe(EditableCell);
    expect(registry.getHeader('editableHeader')).toBe(EditableHeader);
  });
});

describe('editable filter', () => {
  const { filter } = editableColumn();
  const workspace = { projectId: 'p1' };

  it("keeps this project's data for Editable", () => {
    expect(filter?.toParams?.('editable', workspace)).toEqual({ authorized_project_id: 'p1' });
    expect(filter?.toExcept?.('editable', workspace)).toBeUndefined();
  });

  it("keeps public data less this project's for Read-only", () => {
    expect(filter?.toParams?.('read-only', workspace)).toEqual({ authorized_public: 'true' });
    expect(filter?.toExcept?.('read-only', workspace)).toEqual({
      authorized_public: 'true',
      authorized_project_id: 'p1',
    });
  });

  it('filters nothing for an unknown value, or Editable without a project', () => {
    expect(filter?.toParams?.('other', workspace)).toEqual({});
    expect(filter?.toParams?.('editable', {})).toEqual({});
  });
});

describe('visibility cell', () => {
  it('shows a globe for a public row', () => {
    renderWithFlags(<VisibilityCell row={{ authorized_public: true }} value="" rowIndex={0} />);
    expect(screen.getByTestId('visibility-cell-public')).toBeInTheDocument();
  });

  it('shows people for a project row, even one of another project', () => {
    renderWithFlags(<VisibilityCell row={{ authorized_public: false }} value="" rowIndex={0} />);
    expect(screen.getByTestId('visibility-cell-project')).toBeInTheDocument();
  });
});

describe('editable cell', () => {
  it('shows a person with a pencil for a record of this project', () => {
    renderWithFlags(<EditableCell row={{ authorized_project_id: 'p1' }} value="" rowIndex={0} />);
    expect(screen.getByTestId('editable-cell-editable')).toBeInTheDocument();
  });

  it('shows a lock for a record of another project', () => {
    renderWithFlags(
      <EditableCell row={{ authorized_project_id: 'other' }} value="" rowIndex={0} />
    );
    expect(screen.getByTestId('editable-cell-read-only')).toBeInTheDocument();
  });
});
