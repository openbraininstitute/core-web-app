import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceSection } from '@/constants';
import { buildCellRenderers } from '@/features/data-grid/bindings/entitycore/cell-renderers';
import {
  scopeColumn,
  withScopeColumn,
} from '@/features/data-grid/bindings/entitycore/columns/scope';
import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import {
  SCOPE_RENDERER,
  ScopeCell,
} from '@/features/data-grid/bindings/entitycore/renderers/scope-cell';
import {
  SCOPE_HEADER_RENDERER,
  ScopeHeader,
} from '@/features/data-grid/bindings/entitycore/renderers/scope-header';
import { ScopeToolbarToggles } from '@/features/data-grid/bindings/entitycore/renderers/scope-toolbar';
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

  it('leaves the registered definition alone and hands back one object per definition', () => {
    expect(morphology().schema.columns.some((c) => c.id === 'scope')).toBe(false);
    expect(withScopeColumn(morphology())).toBe(withScopeColumn(morphology()));
  });

  it.each([
    [ScopeFilter.Public, { authorized_public: 'true' }],
    [ScopeFilter.PublicOnly, { authorized_public: 'true' }],
    [ScopeFilter.PublicFromProject, { authorized_public: 'true', authorized_project_id: PROJECT }],
    [ScopeFilter.Project, { authorized_project_id: PROJECT }],
    [ScopeFilter.Published, { authorized_public: 'true', authorized_project_id: PROJECT }],
    [ScopeFilter.Private, { authorized_public: 'false' }],
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
    renderWithFlags(
      <>
        <ScopeHeader columnId="scope" label="Scope" ctx={ctx} />
        <ScopeToolbarToggles controller={controller} />
      </>
    );
    const filter = () => {
      const value = controller.store.getSnapshot().filters.scope?.value;
      return value?.kind === FilterValueKind.Text ? value.text : undefined;
    };
    const pressed = (testId: string) => screen.getByTestId(testId).getAttribute('aria-pressed');
    return { controller, filter, pressed };
  }

  it('shows both and filters nothing by default', () => {
    const { filter, pressed } = renderHeader();
    expect(pressed('scope-header-public')).toBe('true');
    expect(pressed('scope-header-project')).toBe('true');
    expect(filter()).toBeUndefined();
  });

  it('keeps only the clicked side, and brings both back on a click on either', () => {
    const { filter, pressed } = renderHeader();
    fireEvent.click(screen.getByTestId('scope-header-public'));
    expect(filter()).toBe(ScopeFilter.Public);
    expect(pressed('scope-header-project')).toBe('false');

    fireEvent.click(screen.getByTestId('scope-header-project'));
    expect(filter()).toBeUndefined();

    fireEvent.click(screen.getByTestId('scope-header-project'));
    expect(filter()).toBe(ScopeFilter.Project);
    fireEvent.click(screen.getByTestId('scope-header-project'));
    expect(filter()).toBeUndefined();
    expect(pressed('scope-header-public')).toBe('true');
    expect(pressed('scope-header-project')).toBe('true');
  });

  it('keeps the toolbar marks in step with the header', () => {
    const { filter, pressed } = renderHeader();
    fireEvent.click(screen.getByTestId('scope-toolbar-project'));
    expect(filter()).toBe(ScopeFilter.Project);
    expect(pressed('scope-header-public')).toBe('false');
    expect(pressed('scope-toolbar-public')).toBe('false');

    fireEvent.click(screen.getByTestId('scope-header-public'));
    expect(filter()).toBeUndefined();
    expect(pressed('scope-toolbar-public')).toBe('true');
  });

  it('keeps the selection while switching, so a picker keeps its picks', () => {
    const { controller } = renderHeader();
    act(() => controller.store.dispatch({ type: GridActionType.SetSelection, ids: ['r1'] }));
    fireEvent.click(screen.getByTestId('scope-header-public'));
    expect(controller.store.getSnapshot().selection).toEqual(['r1']);
  });

  it('with one side chosen, can leave out either part of it, never both', async () => {
    const { filter } = renderHeader();
    expect(screen.getByTestId('scope-filter-trigger')).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(screen.getByTestId('scope-header-project'));
    fireEvent.click(screen.getByTestId('scope-filter-trigger'));
    await screen.findByTestId('scope-filter-panel');

    fireEvent.click(screen.getByTestId('scope-filter-joint'));
    expect(filter()).toBe(ScopeFilter.Private);
    expect(screen.getByTestId('scope-filter-single')).toBeDisabled();

    fireEvent.click(screen.getByTestId('scope-filter-joint'));
    fireEvent.click(screen.getByTestId('scope-filter-single'));
    expect(filter()).toBe(ScopeFilter.Published);
    expect(screen.getByTestId('scope-filter-joint')).toBeDisabled();
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

  it("shows both marks for the project's made-public data", () => {
    renderWithFlags(
      <ScopeCell
        row={{ authorized_public: true, authorized_project_id: PROJECT }}
        value="Public"
        rowIndex={0}
      />
    );
    const mark = screen.getByRole('img', { name: 'Project, made public' });
    expect(mark.querySelector('.anticon-global')).not.toBeNull();
    expect(mark.querySelector('.anticon-team')).not.toBeNull();
  });

  it('falls back to the empty placeholder without the flag', () => {
    renderWithFlags(<ScopeCell row={{}} value="" rowIndex={0} />);
    expect(screen.getByText(EMPTY_PLACEHOLDER)).toBeInTheDocument();
  });
});
