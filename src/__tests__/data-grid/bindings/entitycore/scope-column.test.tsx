import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceSection } from '@/constants';
import { buildCellRenderers } from '@/features/data-grid/bindings/entitycore/cell-renderers';
import {
  scopeColumn,
  withoutScopeColumn,
  withScopeColumn,
} from '@/features/data-grid/bindings/entitycore/columns/scope';
import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import {
  SCOPE_HEADER_RENDERER,
  SCOPE_RENDERER,
  ScopeCell,
  ScopeHeader,
} from '@/features/data-grid/bindings/entitycore/renderers/scope-cells';
import { ScopeFilter } from '@/features/data-grid/bindings/entitycore/scope-filter';
import {
  createDefaultOperatorRegistry,
  FilterValueKind,
  GridActionType,
  GridController,
  OperatorId,
  resolveColumns,
} from '@/features/data-grid/core';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';
import { defaultFlags } from '@/features/feature-flags/config';
import { projectScopeIconFlag } from '@/features/feature-flags/flags';
import { FlagsProvider } from '@/features/feature-flags/provider';

import type { ReactElement } from 'react';
import type { TAnyEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { FeatureFlags } from '@/features/feature-flags/flags';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl', projectId: 'proj' }),
}));

const PROJECT = 'proj';

const renderWithFlags = (ui: ReactElement, flags: FeatureFlags = defaultFlags) =>
  render(<FlagsProvider flags={flags}>{ui}</FlagsProvider>);

function morphology(): TAnyEntityGridDefinition {
  const definition = getEntityGridDefinition('cell_morphology');
  if (!definition) throw new Error('no registered grid definition for cell_morphology');
  return definition;
}

describe('scope column', () => {
  it('leads the listing it is added to', () => {
    const { schema } = withScopeColumn(morphology());
    const resolved = resolveColumns(schema, {
      dataType: 'cell_morphology',
      section: WorkspaceSection.Data,
    });
    expect(resolved[0]?.id).toBe('scope');
  });

  it('comes with every registered definition, as one object per definition', () => {
    expect(morphology().schema.columns.some((c) => c.id === 'scope')).toBe(true);
    expect(morphology()).toBe(morphology());
    expect(withScopeColumn(morphology())).toBe(morphology());
  });

  it('is dropped, as one object, by a listing that shows no scope', () => {
    const reduced = withoutScopeColumn(morphology());
    expect(reduced.schema.columns.some((c) => c.id === 'scope')).toBe(false);
    expect(withoutScopeColumn(morphology())).toBe(reduced);
  });

  it.each([
    [ScopeFilter.Public, { authorized_public: 'true' }],
    [ScopeFilter.PublicOnly, { authorized_public: 'true' }],
    [ScopeFilter.PublicFromProject, { authorized_public: 'true', authorized_project_id: PROJECT }],
    [ScopeFilter.Project, { authorized_project_id: PROJECT }],
    [ScopeFilter.Published, { authorized_public: 'true', authorized_project_id: PROJECT }],
    [ScopeFilter.Private, { authorized_public: 'false' }],
    [ScopeFilter.NotPublished, { authorized_public: undefined, authorized_project_id: undefined }],
  ])('filters %s on the bare authorized params', (text, expected) => {
    const { schema } = withScopeColumn(morphology());
    const params = serializeQuery(
      {
        page: 1,
        pageSize: 20,
        sort: [],
        filters: {
          scope: {
            columnId: 'scope',
            operator: OperatorId.Eq,
            targetId: 'scope',
            value: { kind: FilterValueKind.Text, text },
          },
        },
      },
      schema,
      { workspace: { projectId: PROJECT } }
    );
    expect({
      authorized_public: params.authorized_public,
      authorized_project_id: params.authorized_project_id,
    }).toEqual(expected);
  });

  it("leaves the project's made-public data out of public data from other projects", () => {
    const { filter } = scopeColumn();
    const published = { authorized_public: 'true', authorized_project_id: PROJECT };
    expect(filter?.toExcept?.(ScopeFilter.PublicOnly, { projectId: PROJECT })).toEqual(published);
    expect(filter?.toExcept?.(ScopeFilter.Public, { projectId: PROJECT })).toBeUndefined();
    expect(filter?.toExcept?.(ScopeFilter.NotPublished, { projectId: PROJECT })).toEqual(
      published
    );
    expect(filter?.toExcept?.(ScopeFilter.PublicOnly, {})).toBeUndefined();
  });

  it('labels rows for search and export, and leaves an unknown row blank', () => {
    const column = scopeColumn<{ authorized_public?: boolean }>();
    expect(column.getValue?.({ authorized_public: true })).toBe('Public');
    expect(column.getValue?.({ authorized_public: false })).toBe('Project');
    expect(column.getValue?.({})).toBe('');
  });

  it('sorts by listing each kind of row first in turn', () => {
    const column = scopeColumn();
    expect(column.sortable).toBe(true);
    expect(column.sortOrders?.map((o) => o.id)).toEqual(['public', 'project', 'published']);
  });

  it('has its renderers registered for every listing', () => {
    const registry = buildCellRenderers(morphology());
    expect(registry.has(SCOPE_RENDERER)).toBe(true);
    expect(registry.getHeader(SCOPE_HEADER_RENDERER)).toBe(ScopeHeader);
  });
});

describe('scope header', () => {
  function renderHeader() {
    const controller = new GridController({
      schema: withScopeColumn(morphology()).schema,
      context: { dataType: 'cell_morphology', section: WorkspaceSection.Data },
      defaultPageSize: 20,
    });
    const ctx = { controller, operators: createDefaultOperatorRegistry() };
    renderWithFlags(<ScopeHeader columnId="scope" label="Scope" ctx={ctx} />);
    const filter = () => {
      const value = controller.store.getSnapshot().filters.scope?.value;
      return value?.kind === FilterValueKind.Text ? value.text : undefined;
    };
    const pressed = (testId: string) => screen.getByTestId(testId).getAttribute('aria-pressed');
    return { controller, filter, pressed };
  }

  it('shows exactly three toggles, all on and filtering nothing by default', () => {
    const { filter, pressed } = renderHeader();
    expect(screen.getAllByRole('button')).toHaveLength(3);
    for (const kind of ['public', 'project', 'published']) {
      expect(pressed(`scope-header-${kind}`)).toBe('true');
    }
    expect(filter()).toBeUndefined();
  });

  it.each([
    ['public', ScopeFilter.Project],
    ['project', ScopeFilter.Public],
    ['published', ScopeFilter.NotPublished],
  ])('a click on %s switches only that kind off', (kind, expected) => {
    const { filter, pressed } = renderHeader();
    fireEvent.click(screen.getByTestId(`scope-header-${kind}`));
    expect(filter()).toBe(expected);
    for (const other of ['public', 'project', 'published']) {
      expect(pressed(`scope-header-${other}`)).toBe(String(other !== kind));
    }
  });

  it('switches each kind back on alone, and back to everything', () => {
    const { filter } = renderHeader();
    fireEvent.click(screen.getByTestId('scope-header-public'));
    fireEvent.click(screen.getByTestId('scope-header-project'));
    expect(filter()).toBe(ScopeFilter.Published);
    fireEvent.click(screen.getByTestId('scope-header-public'));
    expect(filter()).toBe(ScopeFilter.Public);
    fireEvent.click(screen.getByTestId('scope-header-project'));
    expect(filter()).toBeUndefined();
  });

  it('keeps the last kind on', () => {
    const { filter, pressed } = renderHeader();
    fireEvent.click(screen.getByTestId('scope-header-public'));
    fireEvent.click(screen.getByTestId('scope-header-published'));
    expect(filter()).toBe(ScopeFilter.Private);
    fireEvent.click(screen.getByTestId('scope-header-project'));
    expect(filter()).toBe(ScopeFilter.Private);
    expect(pressed('scope-header-project')).toBe('true');
  });

  it('keeps the selection while switching, so a picker keeps its picks', () => {
    const { controller } = renderHeader();
    act(() => controller.store.dispatch({ type: GridActionType.SetSelection, ids: ['r1'] }));
    fireEvent.click(screen.getByTestId('scope-header-public'));
    expect(controller.store.getSnapshot().selection).toEqual(['r1']);
  });
});

describe('scope cell', () => {
  it('shows a globe for public data from elsewhere, named in its hover card', async () => {
    renderWithFlags(
      <ScopeCell
        row={{ authorized_public: true, authorized_project_id: 'other' }}
        value="Public"
        rowIndex={0}
      />
    );
    expect(screen.getByRole('img', { name: 'Public' })).toBeInTheDocument();

    fireEvent.focus(screen.getByTestId('scope-cell-public'));
    await waitFor(() =>
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent('Public')
    );
  });

  // antd's `.anticon { color: inherit }` ties with a colour class on the icon itself, and the
  // stylesheet loaded last wins, so the colour sits on a wrapper the icon inherits from
  it('colours the globe through its wrapper', () => {
    renderWithFlags(<ScopeCell row={{ authorized_public: true }} value="Public" rowIndex={0} />);
    const globe = screen.getByRole('img', { name: 'Public' });
    expect(globe).not.toHaveClass('text-green-600');
    expect(globe.parentElement).toHaveClass('text-green-600');
  });

  it('greys the icon of a hierarchy row shown only for its children', () => {
    renderWithFlags(
      <ScopeCell row={{ authorized_public: true, isFiltered: false }} value="Public" rowIndex={0} />
    );
    expect(screen.getByRole('img', { name: 'Public' }).parentElement).not.toHaveClass(
      'text-green-600'
    );
  });

  it("shows a group of people for the project's private data", () => {
    renderWithFlags(<ScopeCell row={{ authorized_public: false }} value="Project" rowIndex={0} />);
    expect(screen.getByRole('img', { name: 'Project' })).toHaveClass('anticon-team');
  });

  it('shows one person for a project row behind the icon flag', () => {
    renderWithFlags(<ScopeCell row={{ authorized_public: false }} value="Project" rowIndex={0} />, {
      ...defaultFlags,
      [projectScopeIconFlag.key]: 'one',
    });
    expect(screen.getByRole('img', { name: 'Project' })).toHaveClass('anticon-user');
  });

  it("shows a globe with a person badge for the project's made-public data", () => {
    renderWithFlags(
      <ScopeCell
        row={{ authorized_public: true, authorized_project_id: PROJECT }}
        value="Public"
        rowIndex={0}
      />
    );
    expect(screen.getByTestId('scope-cell-published')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Project, made public' })).toBeInTheDocument();
  });

  it('falls back to the empty placeholder without the flag', () => {
    renderWithFlags(<ScopeCell row={{}} value="" rowIndex={0} />);
    expect(screen.getByText(EMPTY_PLACEHOLDER)).toBeInTheDocument();
  });
});
