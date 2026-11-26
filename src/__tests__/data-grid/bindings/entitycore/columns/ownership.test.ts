import { describe, expect, it } from 'vitest';

import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import {
  defaultHiddenColumnIds,
  OperatorId,
  resolveColumns,
  resolveFilterPanelGroups,
} from '@/features/data-grid/core';
import { DATA_BROWSE_ALLOWED_ENTITIES } from '@/features/views/listing/data-browse-entities';

const combinedData = { section: WorkspaceSection.Data, scope: WorkspaceScope.Combined };

describe('ownership columns', () => {
  it.each(
    DATA_BROWSE_ALLOWED_ENTITIES
  )('%s: Project is the first column, with a checkbox filter', (dataType) => {
    const definition = getEntityGridDefinition(dataType);
    if (!definition) throw new Error(`no grid definition for ${dataType}`);
    const [first] = resolveColumns(definition.schema, { dataType, ...combinedData });
    expect(first).toMatchObject({
      id: 'projectOwnership',
      header: 'Project',
      filterAvailable: true,
      hiddenByDefaultResolved: false,
      filter: { operators: [OperatorId.In] },
    });
  });

  it.each(
    DATA_BROWSE_ALLOWED_ENTITIES
  )('%s: Visibility is second, hidden by default and offered in Filters', (dataType) => {
    const definition = getEntityGridDefinition(dataType);
    if (!definition) throw new Error(`no grid definition for ${dataType}`);
    const context = { dataType, ...combinedData };
    const [, second] = resolveColumns(definition.schema, context);
    expect(second).toMatchObject({
      id: 'visibility',
      header: 'Visibility',
      filterAvailable: true,
      hiddenByDefaultResolved: true,
      filter: { operators: [OperatorId.In] },
    });
    const hidden = defaultHiddenColumnIds(definition.schema, context);
    expect(hidden).toContain('visibility');
    const entry = resolveFilterPanelGroups(definition.schema, context, hidden)
      .flatMap((group) => group.filters)
      .find((e) => e.key === 'visibility');
    expect(entry?.def.options).toEqual({
      kind: 'static',
      searchable: false,
      exhaustive: true,
      items: [
        { id: 'public', label: 'Public', badge: { icon: 'globe', tone: 'public' } },
        { id: 'private', label: 'Private', badge: { icon: 'lock', tone: 'neutral' } },
      ],
    });
  });

  it('is absent outside the combined Data listing', () => {
    const definition = getEntityGridDefinition(DATA_BROWSE_ALLOWED_ENTITIES[0]);
    if (!definition) throw new Error('no grid definition');
    const ids = resolveColumns(definition.schema, {
      dataType: DATA_BROWSE_ALLOWED_ENTITIES[0],
      section: WorkspaceSection.Data,
      scope: WorkspaceScope.Project,
    }).map((c) => c.id);
    expect(ids).not.toContain('projectOwnership');
    expect(ids).not.toContain('visibility');
  });
});
