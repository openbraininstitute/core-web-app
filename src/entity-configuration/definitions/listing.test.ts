import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import {
  collectDefaultActiveColumns,
  collectListingFieldKeys,
  matchesContextualRule,
  matchesFieldApiWhen,
  resolveContextualValue,
  resolveFieldListing,
} from './listing';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { FieldDefinition } from '@/entity-configuration/definitions/types';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

describe('field listing resolver', () => {
  it('supports list-based when values and matches predicates', () => {
    const value = resolveContextualValue(
      {
        default: false,
        rules: [
          {
            when: {
              dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
              section: [WorkspaceSection.BuildWorkflow, WorkspaceSection.SimulateWorkflow],
            },
            value: true,
          },
          {
            when: { scope: WorkspaceScope.Project },
            matches: (ctx) => ctx.section === WorkspaceSection.BuildWorkflow,
            value: false,
          },
        ],
      },
      {
        dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
        section: WorkspaceSection.BuildWorkflow,
        scope: WorkspaceScope.Public,
      }
    );

    const overriddenValue = resolveContextualValue(
      {
        default: false,
        rules: [
          {
            when: {
              dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
              section: [WorkspaceSection.BuildWorkflow, WorkspaceSection.SimulateWorkflow],
            },
            value: true,
          },
          {
            when: { scope: WorkspaceScope.Project },
            matches: (ctx) => ctx.section === WorkspaceSection.BuildWorkflow,
            value: false,
          },
        ],
      },
      {
        dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
        section: WorkspaceSection.BuildWorkflow,
        scope: WorkspaceScope.Project,
      }
    );

    expect(value).toBe(true);
    expect(overriddenValue).toBe(false);
  });

  it('falls back to legacy field metadata when contextual config is absent', () => {
    const field: FieldDefinition<EntityCoreObjectTypes> = {
      title: 'Species',
      filter: null,
      isDisplayable: true,
      isFilterable: false,
      defaultConstraint: 'species__name__in',
      perTypeConstraint: {
        [ExtendedEntitiesTypeDict.UniversalCellMorphology]: 'subject__species__name__in',
      },
    };

    const listing = resolveFieldListing(field, {
      dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
      section: WorkspaceSection.BuildWorkflow,
    });

    expect(listing.columnAvailable).toBe(true);
    expect(listing.filterAvailable).toBe(false);
    expect(listing.constraint).toBe('subject__species__name__in');
  });

  it('collects legacy view fields and context-enabled extras while keeping default active columns limited to view columns', () => {
    const view: ViewDefinitionConfig = {
      title: 'Test',
      name: 'test',
      columns: [EntityCoreFields.Name],
      filterableFields: [EntityCoreFields.Contributions],
      displayableFields: [EntityCoreFields.Contributions],
    };

    const registry = {
      [EntityCoreFields.Name]: {
        title: 'Name',
        filter: null,
        isDisplayable: true,
      },
      [EntityCoreFields.Contributions]: {
        title: 'Contributors',
        filter: null,
        isDisplayable: true,
      },
      [EntityCoreFields.GenerationType]: {
        title: 'Generation type',
        filter: null,
        presentation: {
          column: {
            available: {
              rules: [
                {
                  when: {
                    dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
                    section: WorkspaceSection.BuildWorkflow,
                  },
                  value: true,
                },
              ],
            },
          },
        },
      },
    } satisfies Partial<Record<EntityCoreFields, FieldDefinition<EntityCoreObjectTypes>>>;

    const context = {
      dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
      section: WorkspaceSection.BuildWorkflow,
    };

    expect(collectListingFieldKeys(view, context, registry)).toEqual([
      EntityCoreFields.Name,
      EntityCoreFields.Contributions,
      EntityCoreFields.GenerationType,
    ]);
    expect(collectDefaultActiveColumns(view, context)).toContain(EntityCoreFields.Name);
    expect(collectDefaultActiveColumns(view, context)).not.toContain(
      EntityCoreFields.GenerationType
    );
  });
});

describe('matchesFieldApiWhen', () => {
  const ctx = {
    dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
    section: WorkspaceSection.BuildWorkflow,
    scope: WorkspaceScope.Project,
  };

  it('matches when the when predicate is undefined', () => {
    expect(matchesFieldApiWhen(undefined, ctx)).toBe(true);
  });

  it('matches when all listed keys match (AND across keys)', () => {
    expect(
      matchesFieldApiWhen(
        {
          dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
          section: WorkspaceSection.BuildWorkflow,
        },
        ctx
      )
    ).toBe(true);
  });

  it('does not match when one key differs (AND across keys)', () => {
    expect(
      matchesFieldApiWhen(
        {
          dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
          section: WorkspaceSection.ExtractWorkflow,
        },
        ctx
      )
    ).toBe(false);
  });

  it('uses OR semantics for array values within a single key', () => {
    expect(
      matchesFieldApiWhen(
        { section: [WorkspaceSection.BuildWorkflow, WorkspaceSection.SimulateWorkflow] },
        ctx
      )
    ).toBe(true);
    expect(
      matchesFieldApiWhen(
        { section: [WorkspaceSection.ExtractWorkflow, WorkspaceSection.SimulateWorkflow] },
        ctx
      )
    ).toBe(false);
  });

  it('treats omitted keys as unconstrained', () => {
    expect(matchesFieldApiWhen({ scope: WorkspaceScope.Project }, ctx)).toBe(true);
  });
});

describe('matchesContextualRule', () => {
  const ctx = {
    dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
    section: WorkspaceSection.BuildWorkflow,
    scope: WorkspaceScope.Project,
  };

  it('matches when both when and the imperative matches predicate pass', () => {
    expect(
      matchesContextualRule(
        {
          when: { section: WorkspaceSection.BuildWorkflow },
          matches: (c) => c.scope === WorkspaceScope.Project,
          value: 'ok',
        },
        ctx
      )
    ).toBe(true);
  });

  it('does not match when the when predicate fails', () => {
    expect(
      matchesContextualRule(
        { when: { section: WorkspaceSection.ExtractWorkflow }, value: 'nope' },
        ctx
      )
    ).toBe(false);
  });

  it('does not match when matches returns false even if when passes', () => {
    expect(
      matchesContextualRule(
        {
          when: { section: WorkspaceSection.BuildWorkflow },
          matches: () => false,
          value: 'nope',
        },
        ctx
      )
    ).toBe(false);
  });
});

describe('resolveContextualValue — extended', () => {
  const ctx = {
    dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
    section: WorkspaceSection.BuildWorkflow,
  };

  it('returns undefined when the contextual config is absent', () => {
    expect(resolveContextualValue<boolean>(undefined, ctx)).toBeUndefined();
  });

  it('returns the default when no rule matches', () => {
    expect(
      resolveContextualValue(
        { default: 'fallback', rules: [{ when: { scope: WorkspaceScope.Public }, value: 'rule' }] },
        ctx
      )
    ).toBe('fallback');
  });

  it('returns undefined when there is neither default nor matching rule', () => {
    expect(
      resolveContextualValue(
        { rules: [{ when: { scope: WorkspaceScope.Public }, value: 'rule' }] },
        ctx
      )
    ).toBeUndefined();
  });

  it('lets the last matching rule win when multiple rules apply', () => {
    expect(
      resolveContextualValue(
        {
          default: 'd',
          rules: [
            { when: { section: WorkspaceSection.BuildWorkflow }, value: 'first' },
            {
              when: {
                dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
              },
              value: 'second',
            },
          ],
        },
        ctx
      )
    ).toBe('second');
  });
});

describe('resolveFieldListing — fallback precedence', () => {
  it('prefers presentation.filter.constraint over both deprecated paths', () => {
    const field: FieldDefinition<EntityCoreObjectTypes> = {
      title: 'Species',
      filter: null,
      defaultConstraint: 'legacy_default',
      perTypeConstraint: {
        [ExtendedEntitiesTypeDict.UniversalCellMorphology]: 'legacy_per_type',
      },
      presentation: {
        filter: {
          constraint: { default: 'new_constraint' },
        },
      },
    };

    const listing = resolveFieldListing(field, {
      dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
      section: WorkspaceSection.BuildWorkflow,
    });

    expect(listing.constraint).toBe('new_constraint');
  });

  it('falls back to defaultConstraint when perTypeConstraint has no entry for the dataType', () => {
    const field: FieldDefinition<EntityCoreObjectTypes> = {
      title: 'Species',
      filter: null,
      defaultConstraint: 'legacy_default',
      perTypeConstraint: {},
    };

    const listing = resolveFieldListing(field, {
      dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
      section: WorkspaceSection.BuildWorkflow,
    });

    expect(listing.constraint).toBe('legacy_default');
  });

  it('returns unavailable when the field is null', () => {
    const listing = resolveFieldListing(null, {
      dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
    });

    expect(listing.columnAvailable).toBe(false);
    expect(listing.filterAvailable).toBe(false);
    expect(listing.constraint).toBeUndefined();
  });

  it('prefers presentation.column.available over isDisplayable', () => {
    const field: FieldDefinition<EntityCoreObjectTypes> = {
      title: 'Name',
      filter: null,
      isDisplayable: true,
      presentation: {
        column: { available: { default: false } },
      },
    };

    expect(
      resolveFieldListing(field, {
        dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
      }).columnAvailable
    ).toBe(false);
  });
});
