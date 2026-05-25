import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowActivityDictValue } from '@/constants';
import { SchemaMappingKeyDict, SchemaNameDict } from '@/features/scan-config/types';
import { getWorkflow } from '@/ui/segments/workflows/config';
import {
  buildEmSynapseMappingConfigureBinding,
  circuitSimulationConfigureBinding,
  extractCircuitConfigureBinding,
  getScanConfigConfigureBinding,
  ionChannelSimulationConfigureBinding,
  memodelCircuitSimulationConfigureBinding,
  processEmCellMeshConfigureBinding,
  resolveScanConfigFromIdType,
  resolveScanConfigFromRegistry,
  resolveScanConfigGeneratedApiUrl,
  ScanConfigGeneratedApiPath,
} from '@/ui/segments/workflows/config/scan-config-binding';

describe('scan-config workflow binding', () => {
  it('uses the circuit simulation endpoint for circuit browse input', () => {
    const binding = circuitSimulationConfigureBinding(ExtendedEntitiesTypeDict.Circuit);

    expect(binding).toMatchObject({
      browseType: ExtendedEntitiesTypeDict.Circuit,
      scanConfigEntityType: ExtendedEntitiesTypeDict.Circuit,
      generatedApiPath: ScanConfigGeneratedApiPath.CircuitSimulation,
      schemaMappingKey: SchemaMappingKeyDict.Circuit,
    });
    expect(resolveScanConfigFromIdType(binding, ExtendedEntitiesTypeDict.Circuit)).toBe(
      'CircuitFromID'
    );
    expect(resolveScanConfigFromIdType(binding, ExtendedEntitiesTypeDict.Memodel)).toBeUndefined();
  });

  it('switches circuit simulation binding for ME-model-with-synapses input', () => {
    const binding = circuitSimulationConfigureBinding(ExtendedEntitiesTypeDict.MEModelWithSynapses);

    expect(binding.scanConfigEntityType).toBe(ExtendedEntitiesTypeDict.MEModelWithSynapses);
    expect(binding.generatedApiPath).toBe(
      ScanConfigGeneratedApiPath.MEModelWithSynapsesCircuitSimulation
    );
    expect(resolveScanConfigFromIdType(binding, ExtendedEntitiesTypeDict.MEModelWithSynapses)).toBe(
      'MEModelWithSynapsesCircuitFromID'
    );
  });

  it('defines scan-config generated grid paths and FromID mappings for each scan-config workflow activity', () => {
    expect(
      resolveScanConfigFromIdType(
        memodelCircuitSimulationConfigureBinding(),
        ExtendedEntitiesTypeDict.MemodelCircuit
      )
    ).toBe('MEModelFromID');
    expect(
      resolveScanConfigFromIdType(
        ionChannelSimulationConfigureBinding(),
        ExtendedEntitiesTypeDict.IonChannelModel
      )
    ).toBeUndefined();
    expect(
      resolveScanConfigFromIdType(
        extractCircuitConfigureBinding(),
        ExtendedEntitiesTypeDict.Circuit
      )
    ).toBe('CircuitFromID');
    expect(
      resolveScanConfigFromIdType(
        processEmCellMeshConfigureBinding(),
        ExtendedEntitiesTypeDict.EMCellMesh
      )
    ).toBe('EMCellMeshFromID');

    const buildBinding = buildEmSynapseMappingConfigureBinding();
    expect(
      resolveScanConfigFromIdType(buildBinding, ExtendedEntitiesTypeDict.UniversalCellMorphology)
    ).toBe('CellMorphologyFromID');
    expect(resolveScanConfigFromIdType(buildBinding, ExtendedEntitiesTypeDict.Memodel)).toBe(
      'MEModelFromID'
    );
  });

  it('resolves generated API URLs from test environment config', () => {
    expect(resolveScanConfigGeneratedApiUrl(extractCircuitConfigureBinding())).toBe(
      'https://obi-one.test/generated/circuit-extraction-scan-config-generate-grid'
    );
  });

  it('normalizes registry scan-config entries for configure pages', () => {
    expect(
      resolveScanConfigFromRegistry({
        configureBinding: extractCircuitConfigureBinding(),
        schemaName: SchemaNameDict.CircuitExtractionScanConfig,
      })
    ).toEqual({
      entityType: ExtendedEntitiesTypeDict.Circuit,
      schemaName: SchemaNameDict.CircuitExtractionScanConfig,
      generatedEndpoint:
        'https://obi-one.test/generated/circuit-extraction-scan-config-generate-grid',
      schemaMappingKey: SchemaMappingKeyDict.Circuit,
    });
  });

  it('extracts configure bindings from workflow descriptors defensively', () => {
    const workflow = getWorkflow({
      activity: WorkflowActivityDictValue.extract,
      targetType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
    });

    expect(getScanConfigConfigureBinding(workflow)).toEqual(extractCircuitConfigureBinding());
    expect(getScanConfigConfigureBinding(null)).toBeNull();
    expect(getScanConfigConfigureBinding(undefined)).toBeNull();
  });
});
