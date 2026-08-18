import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config as appConfig } from '@/config';
import { SchemaMappingKeyDict, SchemaNameDict } from '@/features/scan-config/types';
import {
  ScanConfigFromIdType,
  type TScanConfigFromIdType,
} from '@/features/scan-config/workflow/scan-config-from-id-type';

import type { TCircuitTargetSimulator } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  SchemaName,
  TSchemaMappingKey,
  TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import type { IWorkflowDescriptor } from './types';

// re-exported so existing consumers of this module keep their import path
export { ScanConfigFromIdType, type TScanConfigFromIdType };

export const ScanConfigGeneratedApiPath = {
  CircuitSimulation: 'circuit-simulation-scan-config-generate-grid',
  Brian2CircuitSimulation: 'brian-2-circuit-simulation-scan-config-generate-grid',
  LearningEngineCircuitSimulation: 'learning-engine-circuit-simulation-scan-config-generate-grid',
  MEModelWithSynapsesCircuitSimulation:
    'me-model-with-synapses-circuit-simulation-scan-config-generate-grid',
  MEModelSimulation: 'me-model-simulation-scan-config-generate-grid',
  IonChannelModelSimulation: 'ion-channel-model-simulation-scan-config-generate-grid',
  CircuitExtraction: 'circuit-extraction-scan-config-generate-grid',
  EFeatureExtraction: 'e-model-e-feature-extraction-scan-config-generate-grid',
  Skeletonization: 'skeletonization-scan-config-generate-grid',
  EMSynapseMapping: 'em-synapse-mapping-scan-config-generate-grid',
  CreateExtracellularRecordingArray:
    'create-extracellular-recording-array-scan-config-generate-grid',
} as const;

/** Maps browse/session entity types to scan-config API, schema, and FromID wiring. */
export type TScanConfigConfigureBinding = {
  /** Primary browse type (matches the workflow's primary configuration input). */
  browseType: TExtendedEntitiesTypeDict;
  /** Entity type used for scan-config API resolution and entity configuration lookup. */
  scanConfigEntityType: TSupportedEntityTypesForScanConfiguration;
  /** Maps session selection ref.type → ObiOne FromID const written under initialize. */
  fromIdTypeByBrowseType: Readonly<
    Partial<Record<TExtendedEntitiesTypeDict, TScanConfigFromIdType>>
  >;
  /** ObiOne generated API path segment (without base URL). */
  generatedApiPath: string;
  /** Key under schema `property_endpoints` for circuit / ion-channel mapping (when applicable). */
  schemaMappingKey?: TSchemaMappingKey;
  /**
   * When `true`, grouped browse selection merges all configuration-input tabs
   * into one neuron set instead of one group per tab.
   */
  mergeBrowseSelectionIntoSingleGroup?: boolean;
};

export function resolveScanConfigFromIdType(
  binding: TScanConfigConfigureBinding,
  browseType: TExtendedEntitiesTypeDict
): TScanConfigFromIdType | undefined {
  return binding.fromIdTypeByBrowseType[browseType];
}

export function buildGeneratedApiUrl(generatedApiPath: string): string {
  return `${appConfig.OBI_ONE_URL}/generated/${generatedApiPath}`;
}

export function resolveScanConfigGeneratedApiUrl(binding: TScanConfigConfigureBinding): string {
  return buildGeneratedApiUrl(binding.generatedApiPath);
}

/**
 * Data-driven selection of the circuit-simulation generation endpoint + schema by the
 * circuit's `target_simulator`. Returns `null` for `NEURON`/`null` (use the descriptor default).
 * This is what lets a single scale-based simulate workflow target the Brian2 or
 * LearningEngine (INAIT) obi-one endpoint without scale-pinned descriptors.
 */
export function resolveSimulatorScanConfigOverride(
  targetSimulator: TCircuitTargetSimulator | null | undefined
): { generatedApiPath: string; schemaName: SchemaName } | null {
  switch (targetSimulator) {
    case 'Brian2':
      return {
        generatedApiPath: ScanConfigGeneratedApiPath.Brian2CircuitSimulation,
        schemaName: SchemaNameDict.Brian2CircuitSimulationScanConfig,
      };
    case 'LearningEngine':
      return {
        generatedApiPath: ScanConfigGeneratedApiPath.LearningEngineCircuitSimulation,
        schemaName: SchemaNameDict.LearningEngineCircuitSimulationScanConfig,
      };
    default:
      return null;
  }
}

/** Workflow registry scan-config entry — single source for configure resolution. */
export type TScanConfigRegistryConfig = {
  configureBinding: TScanConfigConfigureBinding;
  schemaName: SchemaName;
};

export function resolveScanConfigFromRegistry(config: TScanConfigRegistryConfig) {
  return {
    entityType: config.configureBinding.scanConfigEntityType,
    schemaName: config.schemaName,
    generatedEndpoint: resolveScanConfigGeneratedApiUrl(config.configureBinding),
    schemaMappingKey: config.configureBinding.schemaMappingKey,
  };
}

export function getScanConfigConfigureBinding(
  workflow: IWorkflowDescriptor | null | undefined
): TScanConfigConfigureBinding | null {
  return workflow?.scanConfig?.configureBinding ?? null;
}

export function circuitSimulationConfigureBinding(
  browseType: TExtendedEntitiesTypeDict
): TScanConfigConfigureBinding {
  const isSingleNeuronCircuit = browseType === ExtendedEntitiesTypeDict.SingleNeuronCircuit;

  return {
    browseType,
    scanConfigEntityType: isSingleNeuronCircuit
      ? ExtendedEntitiesTypeDict.SingleNeuronCircuit
      : ExtendedEntitiesTypeDict.Circuit,
    fromIdTypeByBrowseType: {
      [browseType]: isSingleNeuronCircuit
        ? ScanConfigFromIdType.MEModelWithSynapsesCircuitFromID
        : ScanConfigFromIdType.CircuitFromID,
    },
    generatedApiPath: isSingleNeuronCircuit
      ? ScanConfigGeneratedApiPath.MEModelWithSynapsesCircuitSimulation
      : ScanConfigGeneratedApiPath.CircuitSimulation,
    schemaMappingKey: SchemaMappingKeyDict.Circuit,
  };
}

export function memodelCircuitSimulationConfigureBinding(): TScanConfigConfigureBinding {
  return {
    browseType: ExtendedEntitiesTypeDict.MemodelCircuit,
    scanConfigEntityType: ExtendedEntitiesTypeDict.MemodelCircuit,
    fromIdTypeByBrowseType: {
      [ExtendedEntitiesTypeDict.MemodelCircuit]: ScanConfigFromIdType.MEModelFromID,
    },
    generatedApiPath: ScanConfigGeneratedApiPath.MEModelSimulation,
    schemaMappingKey: SchemaMappingKeyDict.Circuit,
  };
}

export function ionChannelSimulationConfigureBinding(): TScanConfigConfigureBinding {
  return {
    browseType: ExtendedEntitiesTypeDict.IonChannelModel,
    scanConfigEntityType: ExtendedEntitiesTypeDict.IonChannelModel,
    fromIdTypeByBrowseType: {
      [ExtendedEntitiesTypeDict.IonChannelModel]: ScanConfigFromIdType.IonChannelModelFromID,
    },
    generatedApiPath: ScanConfigGeneratedApiPath.IonChannelModelSimulation,
    schemaMappingKey: SchemaMappingKeyDict.IonChannelModel,
  };
}

export function extractCircuitConfigureBinding(): TScanConfigConfigureBinding {
  return {
    browseType: ExtendedEntitiesTypeDict.Circuit,
    scanConfigEntityType: ExtendedEntitiesTypeDict.Circuit,
    fromIdTypeByBrowseType: {
      [ExtendedEntitiesTypeDict.Circuit]: ScanConfigFromIdType.CircuitFromID,
    },
    generatedApiPath: ScanConfigGeneratedApiPath.CircuitExtraction,
    schemaMappingKey: SchemaMappingKeyDict.Circuit,
  };
}

export function extractEFeaturesConfigureBinding(): TScanConfigConfigureBinding {
  return {
    browseType: ExtendedEntitiesTypeDict.ElectricalCellRecording,
    scanConfigEntityType: ExtendedEntitiesTypeDict.ElectricalCellRecording,
    fromIdTypeByBrowseType: {
      [ExtendedEntitiesTypeDict.ElectricalCellRecording]:
        ScanConfigFromIdType.ElectricalCellRecordingFromID,
    },
    generatedApiPath: ScanConfigGeneratedApiPath.EFeatureExtraction,
    schemaMappingKey: SchemaMappingKeyDict.ElectricalCellRecordings,
  };
}

export function processEmCellMeshConfigureBinding(): TScanConfigConfigureBinding {
  return {
    browseType: ExtendedEntitiesTypeDict.EMCellMesh,
    scanConfigEntityType: ExtendedEntitiesTypeDict.EMCellMesh,
    fromIdTypeByBrowseType: {
      [ExtendedEntitiesTypeDict.EMCellMesh]: ScanConfigFromIdType.EMCellMeshFromID,
    },
    generatedApiPath: ScanConfigGeneratedApiPath.Skeletonization,
  };
}

export function buildEmSynapseMappingConfigureBinding(): TScanConfigConfigureBinding {
  return {
    browseType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
    scanConfigEntityType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
    fromIdTypeByBrowseType: {
      [ExtendedEntitiesTypeDict.UniversalCellMorphology]: ScanConfigFromIdType.CellMorphologyFromID,
      [ExtendedEntitiesTypeDict.Memodel]: ScanConfigFromIdType.MEModelFromID,
    },
    generatedApiPath: ScanConfigGeneratedApiPath.EMSynapseMapping,
    mergeBrowseSelectionIntoSingleGroup: true,
  };
}

export function createExtracellularRecordingArrayConfigureBinding(): TScanConfigConfigureBinding {
  return {
    browseType: ExtendedEntitiesTypeDict.Circuit,
    scanConfigEntityType: ExtendedEntitiesTypeDict.Circuit,
    fromIdTypeByBrowseType: {
      [ExtendedEntitiesTypeDict.Circuit]: ScanConfigFromIdType.CircuitFromID,
    },
    generatedApiPath: ScanConfigGeneratedApiPath.CreateExtracellularRecordingArray,
    schemaMappingKey: SchemaMappingKeyDict.Circuit,
  };
}

export function wholeBrainCircuitSimulationConfigureBinding(): TScanConfigConfigureBinding {
  return {
    browseType: ExtendedEntitiesTypeDict.WholeBrain,
    scanConfigEntityType: ExtendedEntitiesTypeDict.WholeBrain,
    fromIdTypeByBrowseType: {
      [ExtendedEntitiesTypeDict.WholeBrain]: ScanConfigFromIdType.CircuitFromID,
    },
    // Generic circuit-simulation endpoint/schema by default; the actual endpoint
    // (e.g. Brian2) is selected from the circuit's `target_simulator` at configure time
    // via `resolveSimulatorScanConfigOverride`.
    generatedApiPath: ScanConfigGeneratedApiPath.CircuitSimulation,
    schemaMappingKey: SchemaMappingKeyDict.Circuit,
  };
}
