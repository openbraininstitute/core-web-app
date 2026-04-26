import { z } from 'zod';

// biome-ignore lint/style/useImportType: biome hallucination
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type {
  ICellMorphology,
  ICircuit,
  IMEModel,
  IonChannelModel,
  TEntityTypeDict,
} from '@/api/entitycore/types';
import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';
import type { IEntity } from '@/api/entitycore/types/entities/entity';
import type { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import type { AssetContentType, IAsset } from '@/api/entitycore/types/shared/global';
import type { Prettify } from '@/utils/type';

export type SetAtom<Args extends unknown[], Result> = (...args: Args) => Result;

type Primitive = null | boolean | number | string;
export interface ConfigObject {
  [key: string]: ConfigValue | ConfigObject;
}

export type ConfigValue = Primitive | Primitive[] | ConfigObject | ConfigValue[];
export type Config = Record<string, ConfigValue>;

export const SchemaMappingKeyDict = {
  Circuit: 'Circuit',
  IonChannelModel: 'IonChannelModel',
} as const;

export type TSchemaMappingKey = (typeof SchemaMappingKeyDict)[keyof typeof SchemaMappingKeyDict];

export const ScanConfigActivity = {
  Simulate: 'simulate',
  Extract: 'extract',
  Process: 'process',
  Build: 'build',
} as const;

export type TScanConfigActivity = (typeof ScanConfigActivity)[keyof typeof ScanConfigActivity];

export const BaseScanConfigTabs = {
  configuration: 'configuration',
} as const;

export type TSimulateScanConfigTabs = {
  id: keyof typeof SimulateScanConfigTabs;
  __activity: 'simulate';
};
export type TExtractScanConfigTabs = {
  id: keyof typeof ExtractScanConfigTabs;
  __activity: 'extract';
};
export type TBuildScanConfigTabs = {
  id: keyof typeof BuildScanConfigTabs;
  __activity: 'build';
};

export const ProcessScanConfigTabs = {
  ...BaseScanConfigTabs,
  skeletonizations: 'skeletonizations',
} as const;

export type TProcessScanConfigTabs = {
  id: keyof typeof ProcessScanConfigTabs;
  __activity: 'process';
};

export type TScanConfigTabs =
  | Prettify<TSimulateScanConfigTabs>
  | Prettify<TExtractScanConfigTabs>
  | Prettify<TProcessScanConfigTabs>
  | Prettify<TBuildScanConfigTabs>;

export const SimulateScanConfigTabs = {
  ...BaseScanConfigTabs,
  simulations: 'simulations',
} as const;

export const ExtractScanConfigTabs = {
  ...BaseScanConfigTabs,
  extractions: 'extractions',
} as const;

export const BuildScanConfigTabs = {
  ...BaseScanConfigTabs,
  results: 'results',
} as const;

export const ScanConfigTabs = {
  [ScanConfigActivity.Simulate]: SimulateScanConfigTabs,
  [ScanConfigActivity.Extract]: ExtractScanConfigTabs,
  [ScanConfigActivity.Process]: ProcessScanConfigTabs,
  [ScanConfigActivity.Build]: BuildScanConfigTabs,
} as const;

export const ScanConfigDefaultTab = {
  id: SimulateScanConfigTabs.configuration,
  __activity: ScanConfigActivity.Simulate,
} as const;

export type SimExecStatusMap = Map<string, ActivityStatus>;
export type TabType = 'configuration' | 'simulations';

export const SchemaNameDict = {
  // simulation
  CircuitSimulationScanConfig: 'CircuitSimulationScanConfig',
  Brian2CircuitSimulationScanConfig: 'Brian2CircuitSimulationScanConfig',
  LearningEngineCircuitSimulationScanConfig: 'LearningEngineCircuitSimulationScanConfig',
  MEModelSimulationScanConfig: 'MEModelSimulationScanConfig',
  MEModelWithSynapsesCircuitSimulationScanConfig: 'MEModelWithSynapsesCircuitSimulationScanConfig',
  IonChannelModelSimulationScanConfig: 'IonChannelModelSimulationScanConfig',
  // extraction
  CircuitExtractionScanConfig: 'CircuitExtractionScanConfig',
  // build
  EMSynapseMappingScanConfig: 'EMSynapseMappingScanConfig',
  ExtracellularRecordingArrayScanConfig: 'CreateExtracellularRecordingArrayScanConfig',
  // processing
  SkeletonizationScanConfig: 'SkeletonizationScanConfig',
} as const;

export type SchemaName = (typeof SchemaNameDict)[keyof typeof SchemaNameDict];

export type TRootElement = {
  description: string;
  title: string;
  group: string;
  group_order: number;
};

export const ScanConfigUIElementDict = {
  // blocks
  BlockUnion: 'block_union',
  BlockSingle: 'block_single',
  BlockDictionary: 'block_dictionary',
  // components
  StringInput: 'string_input',
  ModelIdentifier: 'model_identifier',
  FloatParameterSweep: 'float_parameter_sweep',
  IntParameterSweep: 'int_parameter_sweep',
  Reference: 'reference',
  EntityPropertyDropdown: 'entity_property_dropdown',
  NeuronIds: 'neuron_ids',
  BooleanInput: 'boolean_input',
  ionChannelVariableModificationBySectionList: 'ion_channel_variable_modification_by_section_list',
  IonChannelVariableModificationByNeuron: 'ion_channel_variable_modification_by_neuron',
  ModelSelectorSingle: 'model_selector_single',
  SelectRecordableIonChannelVariable: 'select_recordable_ion_channel_variable',
  VoltageDuration: 'voltage_duration',
  ModelIdentifierMultiple: 'model_identifier_multiple',
  StringSelectionEnhanced: 'string_selection_enhanced',
  NeuronPropertyFilter: 'neuron_property_filter',
} as const;

export type TScanConfigUIElementDict =
  (typeof ScanConfigUIElementDict)[keyof typeof ScanConfigUIElementDict];
export interface StringInput extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.StringInput;
}

export interface ModelIdentifier extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.ModelIdentifier;
}

export interface TModelIdentifierMultiple extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.ModelIdentifierMultiple;
}
export interface FloatParameterSweep extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.FloatParameterSweep;
  anyOf: [
    {
      type: 'number';
      minimum?: number;
      maximum?: number;
      exclusiveMinimum?: number;
      exclusiveMaximum?: number;
    },
    {
      type: 'array';
      items: {
        type: 'number';
        minimum?: number;
        maximum?: number;
        exclusiveMinimum?: number;
        exclusiveMaximum?: number;
      };
    },
  ];
}

export interface IntParameterSweep extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.IntParameterSweep;
  anyOf: [
    {
      type: 'integer';
      minimum?: number;
      maximum?: number;
      exclusiveMinimum?: number;
      exclusiveMaximum?: number;
    },
    {
      type: 'array';
      items: {
        type: 'integer';
        minimum?: number;
        maximum?: number;
        exclusiveMinimum?: number;
        exclusiveMaximum?: number;
      };
    },
  ];
}

export interface Reference extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.Reference;
  reference_types: Array<string>;
  anyOf?: Array<
    | {
        title?: string;
        allowed_block_types?: Array<string>;
        properties?: { type?: { const?: string } };
        [key: string]: unknown;
      }
    | { type: 'null' }
  >;
}

export interface EntityPropertyDropdown extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.EntityPropertyDropdown;
  entity_type: string;
  property: string;
  property_filter_key?: string;
}
export interface ModelSelectorSingle extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.ModelSelectorSingle;
  model_selector_entity_type: TEntityTypeDict;
  model_selector_property_filter: Record<string, any>;
  properties: {
    id_str: {
      type: string;
      title: string;
      description: string;
    };
    type: {
      type: string;
      const: 'IonChannelModelFromID';
      title: string;
      default: 'IonChannelModelFromID';
    };
  };
}

export interface SelectRecordableIonChannelVariable extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.SelectRecordableIonChannelVariable;
  property: string;
  property_group: string;
  properties: {
    ion_channel_id: {
      anyOf: [{ type: 'string'; format: 'uuid'; description: string }, { type: 'null' }];
      title: string;
    };
    variable_name: {
      type: 'string';
      title: string;
      description: string;
    };
    type: {
      type: 'string';
      const: 'IonChannelVariableForRecording';
      title: string;
      default: 'IonChannelVariableForRecording';
    };
  };
}

export interface NeuronIds extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.NeuronIds;
}
export interface IonChannelRangeVariableModification extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.ionChannelVariableModificationBySectionList;
  description: string;
  property: 'IonChannelRangeVariables';
  title: string;
  type: 'object';
  properties: {
    modification: any;
    neuron_set: any;
    type: Type;
  };
}

export interface IonChannelGlobalVariableModification extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.IonChannelVariableModificationByNeuron;
  description: string;
  title: string;
  property: 'IonChannelGlobalVariables';
  type: 'object';
  properties: {
    modification: any;
    neuron_set: any;
    type: Type;
  };
}

export interface BooleanInput extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.BooleanInput;
  true_label?: string;
  false_label?: string;
}

/**
 * Enhanced string selection: a dropdown where each enum value can carry a custom title, a
 * description and/or a LaTeX representation. Per the obi-one spec, `title_by_key` is provided
 * together with at least one of `description_by_key` / `latex_by_key`, each holding a value for
 * every enum key.
 */
export interface StringSelectionEnhanced extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.StringSelectionEnhanced;
  enum: string[];
  title_by_key?: Record<string, string>;
  description_by_key?: Record<string, string>;
  latex_by_key?: Record<string, string>;
}

export interface VoltageDuration extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.VoltageDuration;
  items: {
    properties: {
      duration: FloatParameterSweep;
      voltage: FloatParameterSweep;
    };
  };
}

export interface NeuronPropertyFilter extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.NeuronPropertyFilter;
  population_source_dropdown_key: string;
}

export interface IBlockUnion extends TRootElement {
  ui_element: typeof ScanConfigUIElementDict.BlockUnion;
  /** the property name used to block between variants (defaults to 'type') */
  discriminator?: string | { propertyName: string; mapping?: Record<string, string> };
  /** array of possible variant schemas */
  oneOf: TBlock[];
}

/** root-level block union (single value that can be one of several types) */
export interface IRootBlockUnion extends TRootElement, IBlockUnion {}

export type TBlockElement = {
  default?: ConfigValue;
  title: string;
  description: string;
  units?: string;
  ui_hidden?: boolean;
};

export type ParamSchema =
  | StringInput
  | ModelIdentifier
  | TModelIdentifierMultiple
  | FloatParameterSweep
  | IntParameterSweep
  | Reference
  | NeuronIds
  | EntityPropertyDropdown
  | BooleanInput
  | IonChannelRangeVariableModification
  | IonChannelGlobalVariableModification
  | ModelSelectorSingle
  | SelectRecordableIonChannelVariable
  | VoltageDuration
  | StringSelectionEnhanced
  | NeuronPropertyFilter;

export type TBlock = {
  title: string;
  description: string;
  properties: Record<string, ParamSchema> & { type: Type };
  required?: string[];
  block_usability_entity_dependent: boolean;
  block_usability_dictionary?: {
    false_message: string;
    property: string;
    property_group: string;
  };
};

export interface IBlockSingle extends TRootElement, TBlock {
  ui_element: typeof ScanConfigUIElementDict.BlockSingle;
  additionalProperties: false;
  required?: string[];
}

export interface IBlockDictionary extends TRootElement {
  ui_element: typeof ScanConfigUIElementDict.BlockDictionary;
  reference_types: Array<string>;
  singular_name: string;
  additionalProperties: {
    oneOf: Array<TBlock>;
  };
}

export type ConfigSchema = {
  additionalProperties: false;
  default_block_reference_labels: Record<string, string>;
  description: string;
  group_order: string[];
  properties: Record<string, IBlockSingle | IBlockDictionary | IRootBlockUnion> & {
    type: Type;
  };
  title: string;
  property_endpoints: Record<string, string>;
};

type Type = {
  const: string;
  default: string;
};

export function isType(v: TRootElement | Type | TBlockElement): v is Type {
  return 'const' in v;
}

export const ActivityCustomFileRenderer = {
  MiniDetailView: 'mini-detail-view',
  Default: 'default',
  TaskConfigurationViewer: 'task-configuration-viewer',
  TaskLogsViewer: 'task-logs-viewer',
} as const;

export type TActivityCustomFileRenderer =
  (typeof ActivityCustomFileRenderer)[keyof typeof ActivityCustomFileRenderer];

export type TActivityCustomFile = {
  id?: string;
  asset: IAsset;
  entity: IEntity;
  assetPath?: string;
  name?: string;
  enforcedRenderType?: AssetContentType;
  renderer: TActivityCustomFileRenderer;
};

export const NodeSchema = z.object({
  morphology_file: z.string(),
  morphology_name: z.string(),
  position: z.tuple([z.number(), z.number(), z.number()]),
  orientation: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});

export const NodesSchema = z.array(NodeSchema);

export enum MorphoViewerTreeItemType {
  Soma = 0,
  Dendrite,
  BasalDendrite,
  ApicalDendrite,
  Myelin,
  Axon,
  Selected,
  Liaison,
  Unknown,
}

const Point3DSchema = z.tuple([z.number(), z.number(), z.number()]);

export const SectionSchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  type: z.enum(MorphoViewerTreeItemType),
  points: z.array(Point3DSchema),
  radii: z.array(z.number()),
});

export const SectionsArraySchema = z.array(SectionSchema);
export type Sections = z.infer<typeof SectionsArraySchema>;

export type Node = z.infer<typeof NodeSchema>;
export type Nodes = z.infer<typeof NodesSchema>;

export type Cell = {
  id: string;
  center: [number, number, number];
  orientation: [number, number, number, number];
  somaRadius: number;
  color: string;
};

export interface MorphoViewerTreeItem {
  x: number;
  y: number;
  z: number;
  radius: number;
  type: MorphoViewerTreeItemType;
  sectionId: string;
  segmentId: string;
  distanceFromSoma: number;
  children?: MorphoViewerTreeItem[];
}

export type TSupportedEntitiesForScanConfiguration =
  | ICircuit
  | IMEModel
  | IonChannelModel
  | ICellMorphology
  | IEMCellMesh;

export type TSupportedEntityTypesForScanConfiguration =
  | typeof ExtendedEntitiesTypeDict.Circuit
  | typeof ExtendedEntitiesTypeDict.MemodelCircuit
  | typeof ExtendedEntitiesTypeDict.SingleNeuronCircuit
  | typeof ExtendedEntitiesTypeDict.IonChannelModel
  | typeof ExtendedEntitiesTypeDict.EMCellMesh
  | typeof ExtendedEntitiesTypeDict.CellMorphology
  | typeof ExtendedEntitiesTypeDict.UniversalCellMorphology
  | typeof ExtendedEntitiesTypeDict.WholeBrain;
