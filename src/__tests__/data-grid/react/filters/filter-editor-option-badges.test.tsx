import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import {
  createDefaultOperatorRegistry,
  FilterOptionsKind,
  GridController,
  OperatorId,
  resolveFilterTargets,
} from '@/features/data-grid/core';
import { FilterEditor } from '@/features/data-grid/react/filters/filter-editor';

import type { IFilterTarget } from '@/features/data-grid/core';

const MORPHOLOGY = ExtendedEntitiesTypeDict.CellMorphology;
const definition = getEntityGridDefinition(MORPHOLOGY);
let controller: GridController<unknown> | undefined;

/** One grid per test, shared by every opening of its filters. */
function grid() {
  if (!definition) throw new Error('no morphology grid definition');
  controller ??= new GridController({
    schema: definition.schema as never,
    context: {
      dataType: MORPHOLOGY,
      section: WorkspaceSection.Data,
      scope: WorkspaceScope.Combined,
    },
    defaultPageSize: 30,
  });
  return controller;
}

/** A checkbox list with neither badges nor flags, as most fixed lists are. */
const PLAIN_TARGET: IFilterTarget = {
  id: 'plain',
  label: 'Plain',
  field: 'plain',
  operators: [OperatorId.In],
  options: {
    kind: FilterOptionsKind.Static,
    items: [
      { id: 'a', label: 'First' },
      { id: 'b', label: 'Second' },
    ],
  },
};

/** Opens a filter editor, as a column header popover does. */
function openFilter(columnId: string) {
  const column = definition?.schema.columns.find((c) => c.id === columnId);
  const targets = column ? resolveFilterTargets(column) : [PLAIN_TARGET];
  const view = render(
    <QueryClientProvider client={new QueryClient()}>
      <FilterEditor
        ctx={{ controller: grid(), operators: createDefaultOperatorRegistry() }}
        filterKey={columnId}
        label={column?.header ?? PLAIN_TARGET.label}
        targets={targets}
        onClose={() => {}}
      />
    </QueryClientProvider>
  );
  const options = screen.getAllByTestId('column-filter-option');
  const box = (label: string) => {
    const option = options.find((o) => o.textContent === label);
    if (!option) throw new Error(`no ${label} option`);
    return within(option).getByTestId('column-filter-option-checkbox');
  };
  return { view, options, box };
}

const appliedProjectFilter = () => controller?.store.getSnapshot().filters.projectOwnership;

afterEach(() => {
  controller?.dispose();
  controller = undefined;
});

describe('Project and Visibility filters', () => {
  it.each([
    ['projectOwnership', ['This project', 'Other projects']],
    ['visibility', ['Public', 'Private']],
  ])('%s: shows each option as its badge, all ticked, with no search box', (columnId, labels) => {
    const { options } = openFilter(columnId);
    expect(options.map((o) => o.textContent)).toEqual(labels);
    for (const option of options) {
      expect(option.querySelector('[data-slot="badge"] svg')).toBeTruthy();
      expect(
        within(option).getByTestId('column-filter-option-checkbox').getAttribute('data-state')
      ).toBe('checked');
    }
    expect(screen.queryByTestId('column-filter-search')).toBeNull();
    expect(screen.queryByTestId('column-filter-clear')).toBeNull();
  });

  it('keeps a change as a draft until Apply', () => {
    const { box } = openFilter('projectOwnership');
    fireEvent.click(box('Other projects'));
    expect(appliedProjectFilter()).toBeUndefined();
    fireEvent.click(screen.getByTestId('column-filter-apply'));
    expect(appliedProjectFilter()?.value).toEqual({ kind: 'set', values: ['current'] });
  });

  it('switches from one option to the other in one visit', () => {
    const { box } = openFilter('projectOwnership');
    fireEvent.click(box('Other projects'));
    fireEvent.click(screen.getByTestId('column-filter-apply'));
    fireEvent.click(box('This project'));
    fireEvent.click(box('Other projects'));
    fireEvent.click(screen.getByTestId('column-filter-apply'));
    expect(appliedProjectFilter()?.value).toEqual({ kind: 'set', values: ['other'] });
  });

  it('turns Apply off while nothing is ticked', () => {
    const { box } = openFilter('projectOwnership');
    fireEvent.click(box('This project'));
    fireEvent.click(box('Other projects'));
    expect(screen.getByTestId('column-filter-apply').hasAttribute('disabled')).toBe(true);
  });

  it('clears the filter when every option is applied', () => {
    const { box } = openFilter('projectOwnership');
    fireEvent.click(box('Other projects'));
    fireEvent.click(screen.getByTestId('column-filter-apply'));
    fireEvent.click(box('Other projects'));
    fireEvent.click(screen.getByTestId('column-filter-apply'));
    expect(appliedProjectFilter()).toBeUndefined();
  });

  it('shows the applied selection when the filter is opened again', () => {
    const first = openFilter('projectOwnership');
    fireEvent.click(first.box('Other projects'));
    fireEvent.click(screen.getByTestId('column-filter-apply'));
    first.view.unmount();

    const { box } = openFilter('projectOwnership');
    expect(box('This project').getAttribute('data-state')).toBe('checked');
    expect(box('Other projects').getAttribute('data-state')).toBe('unchecked');
  });

  it('ticks every option again on Reset', () => {
    const { box } = openFilter('projectOwnership');
    fireEvent.click(box('Other projects'));
    fireEvent.click(screen.getByTestId('column-filter-apply'));
    fireEvent.click(screen.getByTestId('column-filter-reset'));
    expect(appliedProjectFilter()).toBeUndefined();
    expect(box('Other projects').getAttribute('data-state')).toBe('checked');
  });
});

describe('other fixed option lists', () => {
  it('keep plain labels, the search box, and nothing ticked by default', () => {
    const { options } = openFilter('plain');
    expect(options.some((o) => o.querySelector('[data-slot="badge"]'))).toBe(false);
    expect(screen.getByTestId('column-filter-search')).toBeTruthy();
    for (const option of options) {
      expect(
        within(option).getByTestId('column-filter-option-checkbox').getAttribute('data-state')
      ).toBe('unchecked');
    }
  });
});
