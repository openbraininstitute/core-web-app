import type { atom } from "jotai";
import type { EntitycoreExecutionStatus } from "@/api/entitycore/types/entities/execution";
import type { Prettify } from "@/utils/type";
import type { ConfigValue } from "./components/components";

export interface AtomsMap {
  [key: string]:
    | ReturnType<typeof atom<Record<string, ConfigValue>>>
    | Record<string, ReturnType<typeof atom<Record<string, ConfigValue>>>>;
}

export const ScanConfigActivity = {
  Simulate: "simulate",
  Extract: "extract",
} as const;

export type TScanConfigActivity =
  (typeof ScanConfigActivity)[keyof typeof ScanConfigActivity];

export const BaseScanConfigTabs = {
  configuration: "configuration",
} as const;

export const SimulateScanConfigTabs = {
  ...BaseScanConfigTabs,
  simulations: "simulations",
} as const;

export type TSimulateScanConfigTabs = {
  id: keyof typeof SimulateScanConfigTabs;
  __activity: "simulate";
};

export const ExtractScanConfigTabs = {
  ...BaseScanConfigTabs,
  extractions: "extractions",
} as const;

export type TExtractScanConfigTabs = {
  id: keyof typeof ExtractScanConfigTabs;
  __activity: "extract";
};

export type TScanConfigTabs =
  | Prettify<TSimulateScanConfigTabs>
  | Prettify<TExtractScanConfigTabs>;

export const ScanConfigTabs = {
  [ScanConfigActivity.Simulate]: SimulateScanConfigTabs,
  [ScanConfigActivity.Extract]: ExtractScanConfigTabs,
} as const;

export const ScanConfigDefaultTab = {
  id: SimulateScanConfigTabs.configuration,
  __activity: ScanConfigActivity.Simulate,
} as const;

export type SimExecStatusMap = Map<string, EntitycoreExecutionStatus>;
export type TabType = "configuration" | "simulations";

export type SchemaName =
  // simulation
  | "CircuitSimulationScanConfig"
  | "MEModelSimulationScanConfig"
  | "MEModelWithSynapsesCircuitSimulationScanConfig"
  // extraction
  | "CircuitExtractionScanConfig";

export type TRootElement = {
  description: string;
  title: string;
  group: string;
  group_order: number;
};

export const ScanConfigUIElementDict = {
  StringInput: "string_input",
  ModelIdentifier: "model_identifier",
  FloatParameterSweep: "float_parameter_sweep",
  IntParameterSweep: "int_parameter_sweep",
  Reference: "reference",
  EntityPropertyDropdown: "entity_property_dropdown",
  NeuronIds: "neuron_ids",
  BooleanInput: "boolean_input",
  DiscriminatedUnion: "discriminated_union",
  RootBlock: "root_block",
  BlockDictionary: "block_dictionary",
} as const;

export interface StringInput extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.StringInput;
}

export interface ModelIdentifier extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.ModelIdentifier;
}

export interface FloatParameterSweep extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.FloatParameterSweep;
  anyOf: [
    {
      type: "number";
      minimum?: number;
      maximum?: number;
    },
    {
      type: "array";
      items: {
        type: "number";
        minimum?: number;
        maximum?: number;
      };
    },
  ];
}

export interface IntParameterSweep extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.IntParameterSweep;
  anyOf: [
    {
      type: "integer";
      minimum?: number;
      maximum?: number;
    },
    {
      type: "array";
      items: {
        type: "integer";
        minimum?: number;
        maximum?: number;
      };
    },
  ];
}

export interface Reference extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.Reference;
  reference_type: string;
}

export interface EntityPropertyDropdown extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.EntityPropertyDropdown;
  entity_type: string;
  property: string;
}

export interface NeuronIds extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.NeuronIds;
}

export interface BooleanInput extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.BooleanInput;
  true_label?: string;
  false_label?: string;
}

export interface IDiscriminatedUnion extends TBlockElement {
  ui_element: typeof ScanConfigUIElementDict.DiscriminatedUnion;
  /** the property name used to discriminate between variants (defaults to 'type') */
  discriminator?:
    | string
    | { propertyName: string; mapping?: Record<string, string> };
  /** array of possible variant schemas */
  oneOf: TBlock[];
}

/** root-level discriminated union (single value that can be one of several types) */
export interface IRootDiscriminatedUnion
  extends TRootElement,
    IDiscriminatedUnion {}

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
  | FloatParameterSweep
  | IntParameterSweep
  | Reference
  | NeuronIds
  | EntityPropertyDropdown
  | BooleanInput
  | IDiscriminatedUnion;

export type TBlock = {
  title: string;
  description: string;
  properties: Record<string, ParamSchema> & { type: Type };
  required?: string[];
};

export interface IRootBlock extends TRootElement, TBlock {
  ui_element: typeof ScanConfigUIElementDict.RootBlock;
  additionalProperties: false;
  required?: string[];
}

export interface IBlockDictionary extends TRootElement {
  ui_element: typeof ScanConfigUIElementDict.BlockDictionary;
  reference_type: string;
  singular_name: string;
  additionalProperties: {
    oneOf: TBlock[];
  };
}

export type ConfigSchema = {
  additionalProperties: false;
  default_block_reference_labels: Record<string, string>;
  description: string;
  group_order: string[];
  properties: Record<
    string,
    IRootBlock | IBlockDictionary | IRootDiscriminatedUnion
  > & { type: Type };
  title: string;
};

type Type = {
  const: string;
  default: string;
};

export function isType(v: TRootElement | Type | TBlockElement): v is Type {
  return "const" in v;
}
