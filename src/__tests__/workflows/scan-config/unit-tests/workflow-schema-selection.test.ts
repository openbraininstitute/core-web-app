import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ScanConfigUIElementDict, SchemaNameDict } from '@/features/scan-config/types';
import {
  acceptedEntityTypesFromField,
  entityTypeForScanConfigFromIdType,
  findInitializeModelProperty,
  ModelIdentifierFieldStorageMode,
  parseWorkflowSchemaSelection,
  resolveModelIdentifierFieldStorageMode,
  resolvePrimaryEntityIdFromConfigForm,
  scanConfigFromIdTypeForEntityType,
  WorkflowSchemaSelectionMode,
} from '@/features/scan-config/workflow/workflow-schema-selection';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

const circuitId = '11111111-1111-4111-8111-111111111111';
const memodelId = '22222222-2222-4222-8222-222222222222';

function schemaWithInitialize(properties: Record<string, unknown>): ConfigSchema {
  return {
    properties: {
      initialize: {
        ui_element: ScanConfigUIElementDict.BlockSingle,
        properties,
      },
    },
  } as unknown as ConfigSchema;
}

describe('scan-config workflow schema selection', () => {
  it('returns none when initialize has no model selector field', () => {
    const selection = parseWorkflowSchemaSelection({
      schema: schemaWithInitialize({
        type: { const: 'CircuitSimulationScanConfig.Initialize' },
        label: { ui_element: ScanConfigUIElementDict.StringInput },
      }),
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
    });

    expect(selection).toEqual({
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
      uiElement: null,
      selectionMode: WorkflowSchemaSelectionMode.None,
      acceptedFromIdTypes: [],
      tableSelectionType: undefined,
    });
  });

  it('uses the first initialize model selector and explicit accepted input types', () => {
    const schema = schemaWithInitialize({
      type: { const: 'CircuitSimulationScanConfig.Initialize' },
      circuit: {
        ui_element: ScanConfigUIElementDict.ModelIdentifier,
        accepted_input_types: ['CircuitFromID', 'IgnoredFromID', 42],
      },
      fallback: {
        ui_element: ScanConfigUIElementDict.ModelIdentifierMultiple,
        accepted_input_types: ['MEModelFromID'],
      },
    });

    expect(findInitializeModelProperty(schema)?.key).toBe('circuit');
    expect(
      parseWorkflowSchemaSelection({
        schema,
        schemaName: SchemaNameDict.CircuitSimulationScanConfig,
      })
    ).toMatchObject({
      uiElement: ScanConfigUIElementDict.ModelIdentifier,
      selectionMode: WorkflowSchemaSelectionMode.Single,
      acceptedFromIdTypes: ['CircuitFromID', 'IgnoredFromID'],
      tableSelectionType: undefined,
    });
  });

  it('deduplicates accepted entity types collected from nested FromID consts', () => {
    const field = {
      ui_element: ScanConfigUIElementDict.ModelIdentifierMultiple,
      anyOf: [
        { properties: { type: { type: 'string', const: 'CircuitFromID' } } },
        { items: { properties: { type: { type: 'string', const: 'CircuitFromID' } } } },
        { properties: { type: { type: 'string', const: 'MEModelFromID' } } },
        { properties: { type: { type: 'string', const: 'UnknownFromID' } } },
      ],
    };

    expect(acceptedEntityTypesFromField(field)).toEqual([
      ExtendedEntitiesTypeDict.Circuit,
      ExtendedEntitiesTypeDict.Memodel,
    ]);
  });

  it('classifies model_identifier_multiple tuple, grouped, and list storage shapes', () => {
    expect(resolveModelIdentifierFieldStorageMode({ prefixItems: [] })).toBe(
      ModelIdentifierFieldStorageMode.Tuple
    );
    expect(
      resolveModelIdentifierFieldStorageMode({ title: 'NamedTupleSelection', prefixItems: [] })
    ).toBe(ModelIdentifierFieldStorageMode.Grouped);
    expect(resolveModelIdentifierFieldStorageMode({ title: 'NamedTupleSelection' })).toBe(
      ModelIdentifierFieldStorageMode.Grouped
    );
    expect(resolveModelIdentifierFieldStorageMode({ type: 'array' })).toBe(
      ModelIdentifierFieldStorageMode.List
    );
  });

  it('resolves grouped workflow selection when the model field has NamedTuple shape', () => {
    const selection = parseWorkflowSchemaSelection({
      schema: schemaWithInitialize({
        models: {
          ui_element: ScanConfigUIElementDict.ModelIdentifierMultiple,
          title: 'NamedTupleGroup',
          accepted_input_types: ['CellMorphologyFromID', 'MEModelFromID'],
        },
      }),
      schemaName: SchemaNameDict.EMSynapseMappingScanConfig,
    });

    expect(selection).toMatchObject({
      uiElement: ScanConfigUIElementDict.ModelIdentifierMultiple,
      selectionMode: WorkflowSchemaSelectionMode.Grouped,
      acceptedEntityTypes: [
        ExtendedEntitiesTypeDict.UniversalCellMorphology,
        ExtendedEntitiesTypeDict.Memodel,
      ],
      tableSelectionType: 'checkbox',
    });
  });

  it('resolves flat multiple workflow selection for model_identifier_multiple without NamedTuple shape', () => {
    const selection = parseWorkflowSchemaSelection({
      schema: schemaWithInitialize({
        models: {
          ui_element: ScanConfigUIElementDict.ModelIdentifierMultiple,
          accepted_input_types: ['CircuitFromID'],
        },
      }),
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
    });

    expect(selection).toMatchObject({
      uiElement: ScanConfigUIElementDict.ModelIdentifierMultiple,
      selectionMode: WorkflowSchemaSelectionMode.Multiple,
      acceptedEntityTypes: [ExtendedEntitiesTypeDict.Circuit],
      tableSelectionType: 'checkbox',
    });
  });

  it('reads the first valid model entity id from flat or grouped config form values', () => {
    const schema = schemaWithInitialize({
      models: {
        ui_element: ScanConfigUIElementDict.ModelIdentifierMultiple,
        title: 'NamedTupleGroup',
      },
    });

    const groupedConfig: Config = {
      initialize: {
        models: [
          {
            name: 'Group A',
            elements: [
              { type: 'NotAFromID', id_str: 'not-a-uuid' },
              { type: 'CircuitFromID', id_str: circuitId },
            ],
          },
        ],
      },
    };
    const flatConfig: Config = {
      initialize: {
        models: [{ type: 'MEModelFromID', id_str: memodelId }],
      },
    };

    expect(resolvePrimaryEntityIdFromConfigForm(schema, groupedConfig)).toBe(circuitId);
    expect(resolvePrimaryEntityIdFromConfigForm(schema, flatConfig)).toBe(memodelId);
    expect(resolvePrimaryEntityIdFromConfigForm(schema, { initialize: [] })).toBeUndefined();
  });

  it('maps known entity types back to scan-config FromID constants only', () => {
    expect(entityTypeForScanConfigFromIdType('UnknownFromID')).toBeUndefined();
    expect(scanConfigFromIdTypeForEntityType(ExtendedEntitiesTypeDict.Circuit)).toBe(
      'CircuitFromID'
    );
    expect(scanConfigFromIdTypeForEntityType(ExtendedEntitiesTypeDict.IonChannelModel)).toBe(
      undefined
    );
  });
});
