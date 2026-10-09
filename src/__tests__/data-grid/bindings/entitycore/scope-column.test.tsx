import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
import {
  createDefaultOperatorRegistry,
  FilterValueKind,
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

  it.each(['true', 'false'])('filters on the bare authorized_public param (%s)', (text) => {
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
      schema
    );
    expect(params.authorized_public).toBe(text);
  });

  it('labels rows for search and export, and leaves an unknown row blank', () => {
    const column = scopeColumn<{ authorized_public?: boolean }>();
    expect(column.getValue?.({ authorized_public: true })).toBe('Public');
    expect(column.getValue?.({ authorized_public: false })).toBe('Project');
    expect(column.getValue?.({})).toBe('');
    expect(column.sortable).toBe(false);
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
    const filter = () => controller.store.getSnapshot().filters.scope?.value;
    const pressed = (name: string) =>
      screen.getByTestId(`scope-header-${name}`).getAttribute('aria-pressed');
    return { filter, pressed };
  }

  it('shows both and filters nothing by default', () => {
    const { filter, pressed } = renderHeader();
    expect(pressed('public')).toBe('true');
    expect(pressed('project')).toBe('true');
    expect(filter()).toBeUndefined();
  });

  it('switching one off keeps only the other, which then stays on', () => {
    const { filter, pressed } = renderHeader();
    fireEvent.click(screen.getByTestId('scope-header-public'));
    expect(filter()).toEqual({ kind: FilterValueKind.Text, text: 'false' });
    expect(pressed('public')).toBe('false');

    fireEvent.click(screen.getByTestId('scope-header-project'));
    expect(filter()).toEqual({ kind: FilterValueKind.Text, text: 'false' });
    expect(pressed('project')).toBe('true');
  });

  it('switching the other back on shows both again', () => {
    const { filter, pressed } = renderHeader();
    fireEvent.click(screen.getByTestId('scope-header-project'));
    expect(filter()).toEqual({ kind: FilterValueKind.Text, text: 'true' });

    fireEvent.click(screen.getByTestId('scope-header-project'));
    expect(filter()).toBeUndefined();
    expect(pressed('public')).toBe('true');
    expect(pressed('project')).toBe('true');
  });
});

describe('scope cell', () => {
  it('shows a globe for a public row, named in its hover card', async () => {
    renderWithFlags(<ScopeCell row={{ authorized_public: true }} value="Public" rowIndex={0} />);
    expect(screen.getByRole('img', { name: 'Public' })).toBeInTheDocument();

    fireEvent.focus(screen.getByTestId('scope-cell-public'));
    await waitFor(() =>
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent('Public')
    );
  });

  it('shows a group of people for a project row', () => {
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

  it('falls back to the empty placeholder without the flag', () => {
    renderWithFlags(<ScopeCell row={{}} value="" rowIndex={0} />);
    expect(screen.getByText(EMPTY_PLACEHOLDER)).toBeInTheDocument();
  });
});
