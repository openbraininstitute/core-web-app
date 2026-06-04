import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config as appConfig } from '@/config';
import { SchemaMappingKeyDict } from '@/features/scan-config/types';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  SchemaName,
  TSchemaMappingKey,
  TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import type { IWorkflowDescriptor } from './types';

export const ScanConfigFromIdType = {
  CellMorphologyFromID: 'CellMorphologyFromID',
  MEModelFromID: 'MEModelFromID',
  CircuitFromID: 'CircuitFromID',
  EMCellMeshFromID: 'EMCellMeshFromID',
  MEModelWithSynapsesCircuitFromID: 'MEModelWithSynapsesCircuitFromID',
} as const;

export type TScanConfigFromIdType =
  (typeof ScanConfigFromIdType)[keyof typeof ScanConfigFromIdType];

export const ScanConfigGeneratedApiPath = {
  CircuitSimulation: 'circuit-simulation-scan-config-generate-grid',
  MEModelWithSynapsesCircuitSimulation:
    'me-model-with-synapses-circuit-simulation-scan-config-generate-grid',
  MEModelSimulation: 'me-model-simulation-scan-config-generate-grid',
  IonChannelModelSimulation: 'ion-channel-model-simulation-scan-config-generate-grid',
  CircuitExtraction: 'circuit-extraction-scan-config-generate-grid',
  Skeletonization: 'skeletonization-scan-config-generate-grid',
  EMSynapseMapping: 'em-synapse-mapping-scan-config-generate-grid',
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

export function resolveScanConfigGeneratedApiUrl(binding: TScanConfigConfigureBinding): string {
  return `${appConfig.OBI_ONE_URL}/generated/${binding.generatedApiPath}`;
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
  const isMeModelWithSynapses = browseType === ExtendedEntitiesTypeDict.MEModelWithSynapses;

  return {
    browseType,
    scanConfigEntityType: isMeModelWithSynapses
      ? ExtendedEntitiesTypeDict.MEModelWithSynapses
      : ExtendedEntitiesTypeDict.Circuit,
    fromIdTypeByBrowseType: {
      [browseType]: isMeModelWithSynapses
        ? ScanConfigFromIdType.MEModelWithSynapsesCircuitFromID
        : ScanConfigFromIdType.CircuitFromID,
    },
    generatedApiPath: isMeModelWithSynapses
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
    fromIdTypeByBrowseType: {},
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
