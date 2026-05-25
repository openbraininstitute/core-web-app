import { describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  collectWorkflowSessionRefs,
  countSelectedEntities,
  entityRowToFromIdRef,
  getAllRefsFromParsed,
  mergeConfigurationInputs,
  parseModelIdentifierFieldValue,
  resolveEntityFetchTarget,
  selectionsByTypeToFromIdRefs,
  serializeModelIdentifierFieldValue,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple/helpers';
import { ModelIdentifierFieldStorageMode } from '@/features/scan-config/workflow/workflow-schema-selection';
import { WorkflowSessionSelectionMode } from '@/features/scan-config/workflow/workflow-session-selection';
import { buildEmSynapseMappingConfigureBinding } from '@/ui/segments/workflows/config/scan-config-binding';

import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { TModelIdentifierParsedValue } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/types';

const morphologyId = '11111111-1111-4111-8111-111111111111';
const memodelId = '22222222-2222-4222-8222-222222222222';

const morphologyRow: EntityCoreIdentifiableNamed = {
  id: morphologyId,
  legacy_id: null,
  name: 'Morphology A',
  type: ExtendedEntitiesTypeDict.UniversalCellMorphology as EntityCoreIdentifiableNamed['type'],
};
const memodelRow: EntityCoreIdentifiableNamed = {
  id: memodelId,
  legacy_id: null,
  name: 'ME Model A',
  type: ExtendedEntitiesTypeDict.Memodel,
};
const ionChannelRow: EntityCoreIdentifiableNamed = {
  id: '33333333-3333-4333-8333-333333333333',
  legacy_id: null,
  name: 'Ion Channel A',
  type: ExtendedEntitiesTypeDict.IonChannelModel,
};

describe('scan-config model_identifier_multiple helpers', () => {
  it('parses grouped values by keeping only valid named groups', () => {
    const parsed = parseModelIdentifierFieldValue(
      [
        {
          name: 'Valid',
          elements: [{ type: 'CellMorphologyFromID', id_str: morphologyId }],
        },
        {
          name: 'Invalid element',
          elements: [{ type: 'CellMorphologyFromID', id_str: 'not-a-uuid' }],
        },
      ],
      { title: 'NamedTupleGroup' }
    );

    expect(parsed).toEqual({
      storageMode: ModelIdentifierFieldStorageMode.Grouped,
      groups: [
        {
          name: 'Valid',
          elements: [{ type: 'CellMorphologyFromID', id_str: morphologyId }],
        },
      ],
    });
    expect(serializeModelIdentifierFieldValue(parsed)).toEqual([
      {
        name: 'Valid',
        elements: [{ type: 'CellMorphologyFromID', id_str: morphologyId }],
      },
    ]);
  });

  it('returns a default empty group when grouped config has no valid groups', () => {
    for (const value of [undefined, 'not-a-group', [{ name: 'Bad', elements: [] }, null]]) {
      expect(parseModelIdentifierFieldValue(value as never, { title: 'NamedTupleGroup' })).toEqual({
        storageMode: ModelIdentifierFieldStorageMode.Grouped,
        groups: [{ name: 'Default name', elements: [] }],
      });
    }
  });

  it('preserves empty grouped draft values when explicitly allowed by the editor', () => {
    expect(
      parseModelIdentifierFieldValue(
        [
          { name: 'Draft group', elements: [] },
          { name: 'Ready group', elements: [{ type: 'MEModelFromID', id_str: memodelId }] },
          { name: 'Malformed group', elements: [{ type: 'MEModelFromID', id_str: 'bad-id' }] },
        ],
        { title: 'NamedTupleGroup' },
        { allowEmptyGroups: true }
      )
    ).toEqual({
      storageMode: ModelIdentifierFieldStorageMode.Grouped,
      groups: [
        { name: 'Draft group', elements: [] },
        { name: 'Ready group', elements: [{ type: 'MEModelFromID', id_str: memodelId }] },
      ],
    });
  });

  it('parses flat list values by accepting scalar refs and filtering invalid refs', () => {
    expect(
      parseModelIdentifierFieldValue(
        [
          { type: 'MEModelFromID', id_str: memodelId },
          { type: 'MEModelFromID', id_str: 'not-a-uuid' },
          null,
        ],
        { type: 'array' }
      )
    ).toEqual({
      storageMode: ModelIdentifierFieldStorageMode.List,
      items: [{ type: 'MEModelFromID', id_str: memodelId }],
    });

    expect(
      parseModelIdentifierFieldValue(
        { type: 'MEModelFromID', id_str: memodelId },
        { type: 'array' }
      )
    ).toEqual({
      storageMode: ModelIdentifierFieldStorageMode.List,
      items: [{ type: 'MEModelFromID', id_str: memodelId }],
    });
  });

  it('serializes and flattens parsed flat list values', () => {
    const parsed: TModelIdentifierParsedValue = {
      storageMode: ModelIdentifierFieldStorageMode.List,
      items: [{ type: 'MEModelFromID', id_str: memodelId }],
    };

    expect(serializeModelIdentifierFieldValue(parsed)).toEqual([
      { type: 'MEModelFromID', id_str: memodelId },
    ]);
    expect(getAllRefsFromParsed(parsed)).toEqual([{ type: 'MEModelFromID', id_str: memodelId }]);
  });

  it('resolves entity fetch targets from both FromID refs and workflow session refs', () => {
    expect(
      resolveEntityFetchTarget({ type: 'CellMorphologyFromID', id_str: morphologyId })
    ).toEqual({
      entityType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
      id: morphologyId,
    });
    expect(
      resolveEntityFetchTarget({ type: ExtendedEntitiesTypeDict.Memodel, id: memodelId })
    ).toEqual({
      entityType: ExtendedEntitiesTypeDict.Memodel,
      id: memodelId,
    });
    expect(
      resolveEntityFetchTarget({ type: EntityTypeDict.CellMorphology, id: morphologyId })
    ).toEqual({
      entityType: EntityTypeDict.CellMorphology,
      id: morphologyId,
    });
    expect(resolveEntityFetchTarget({ type: 'UnknownFromID', id_str: morphologyId })).toBeNull();
  });

  it('converts selected rows to FromID refs and skips entity types without mappings', () => {
    const binding = buildEmSynapseMappingConfigureBinding();

    expect(
      selectionsByTypeToFromIdRefs(
        {
          [ExtendedEntitiesTypeDict.UniversalCellMorphology]: [morphologyRow],
          [ExtendedEntitiesTypeDict.Memodel]: [memodelRow],
          [ExtendedEntitiesTypeDict.IonChannelModel]: [ionChannelRow],
        },
        binding
      )
    ).toEqual([
      { type: 'CellMorphologyFromID', id_str: morphologyId },
      { type: 'MEModelFromID', id_str: memodelId },
    ]);
    expect(
      entityRowToFromIdRef(morphologyRow, ExtendedEntitiesTypeDict.UniversalCellMorphology)
    ).toEqual({ type: 'CellMorphologyFromID', id_str: morphologyId });
  });

  it('merges schema accepted types with workflow configuration metadata', () => {
    expect(
      mergeConfigurationInputs({
        paramSchema: { accepted_input_types: ['MEModelFromID'] },
        configurationInputs: [
          {
            type: ExtendedEntitiesTypeDict.Memodel,
            label: 'ME models',
            filters: { species: 'mouse' },
          },
          { type: ExtendedEntitiesTypeDict.UniversalCellMorphology, label: 'Morphologies' },
        ],
      })
    ).toEqual([
      {
        type: ExtendedEntitiesTypeDict.Memodel,
        label: 'ME models',
        filters: { species: 'mouse' },
      },
    ]);

    expect(
      mergeConfigurationInputs({
        paramSchema: {},
        configurationInputs: [{ type: ExtendedEntitiesTypeDict.UniversalCellMorphology }],
      })
    ).toEqual([
      {
        type: ExtendedEntitiesTypeDict.UniversalCellMorphology,
        label: ExtendedEntitiesTypeDict.UniversalCellMorphology,
        filters: undefined,
      },
    ]);
  });

  it('counts selections and flattens refs from workflow session and parsed values', () => {
    expect(
      countSelectedEntities({
        [ExtendedEntitiesTypeDict.UniversalCellMorphology]: [morphologyRow],
        [ExtendedEntitiesTypeDict.Memodel]: [memodelRow],
        [ExtendedEntitiesTypeDict.Circuit]: undefined,
      })
    ).toBe(2);

    expect(collectWorkflowSessionRefs(null)).toEqual([]);
    expect(
      collectWorkflowSessionRefs({
        mode: WorkflowSessionSelectionMode.Single,
        item: { type: ExtendedEntitiesTypeDict.UniversalCellMorphology, id: morphologyId },
      })
    ).toEqual([{ type: ExtendedEntitiesTypeDict.UniversalCellMorphology, id: morphologyId }]);
    expect(
      collectWorkflowSessionRefs({
        mode: WorkflowSessionSelectionMode.List,
        items: [{ type: ExtendedEntitiesTypeDict.Memodel, id: memodelId }],
      })
    ).toEqual([{ type: ExtendedEntitiesTypeDict.Memodel, id: memodelId }]);
    expect(
      collectWorkflowSessionRefs({
        mode: WorkflowSessionSelectionMode.Grouped,
        groups: [
          {
            items: [
              { type: ExtendedEntitiesTypeDict.UniversalCellMorphology, id: morphologyId },
              { type: ExtendedEntitiesTypeDict.Memodel, id: memodelId },
            ],
          },
        ],
      })
    ).toEqual([
      { type: ExtendedEntitiesTypeDict.UniversalCellMorphology, id: morphologyId },
      { type: ExtendedEntitiesTypeDict.Memodel, id: memodelId },
    ]);
    expect(collectWorkflowSessionRefs({ mode: 'unknown' } as never)).toEqual([]);

    const parsed: TModelIdentifierParsedValue = {
      storageMode: ModelIdentifierFieldStorageMode.Grouped,
      groups: [{ name: 'Group', elements: [{ type: 'MEModelFromID', id_str: memodelId }] }],
    };

    expect(getAllRefsFromParsed(parsed)).toEqual([{ type: 'MEModelFromID', id_str: memodelId }]);
  });
});
