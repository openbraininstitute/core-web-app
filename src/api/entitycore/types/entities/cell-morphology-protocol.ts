import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { Prettify } from '@/utils/type';

export const StainingType = {
  Golgi: {
    key: 'golgi',
    label: 'Golgi',
  },
  Nissl: {
    key: 'nissl',
    label: 'Nissl',
  },
  LuxolFastBlue: {
    key: 'luxol_fast_blue',
    label: 'Luxol fast blue',
  },
  FluorescentNissl: {
    key: 'fluorescent_nissl',
    label: 'Fluorescent Nissl',
  },
  FluorescentDyes: {
    key: 'fluorescent_dyes',
    label: 'Fluorescent dyes',
  },
  FluorescentProteinExpression: {
    key: 'fluorescent_protein_expression',
    label: 'Fluorescent protein expression',
  },
  Immunohistochemistry: {
    key: 'immunohistochemistry',
    label: 'Immunohistochemistry',
  },
  Other: {
    key: 'other',
    label: 'Other',
  },
} as const;

export const StainingTypeDictionary = Object.fromEntries(
  Object.entries(StainingType).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof StainingType]: (typeof StainingType)[K]['key'];
};

export type TStainingType = (typeof StainingTypeDictionary)[keyof typeof StainingTypeDictionary];

export const SlicingDirectionType = {
  Coronal: {
    key: 'coronal',
    label: 'Coronal',
  },
  Sagittal: {
    key: 'sagittal',
    label: 'Sagittal',
  },
  Horizontal: {
    key: 'horizontal',
    label: 'Horizontal',
  },
  Custom: {
    key: 'custom',
    label: 'Custom',
  },
} as const;

export const SlicingDirectionTypeDictionary = Object.fromEntries(
  Object.entries(SlicingDirectionType).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof SlicingDirectionType]: (typeof SlicingDirectionType)[K]['key'];
};

export type TSlicingDirectionType =
  (typeof SlicingDirectionTypeDictionary)[keyof typeof SlicingDirectionTypeDictionary];

export const CellMorphologyGenerationType = {
  DigitalReconstruction: {
    key: 'digital_reconstruction',
    label: 'Digital reconstruction',
  },
  ModifiedReconstruction: {
    key: 'modified_reconstruction',
    label: 'Modified reconstruction',
  },
  ComputationallySynthesized: {
    key: 'computationally_synthesized',
    label: 'Computationally synthesized',
  },
  Placeholder: {
    key: 'placeholder',
    label: 'Placeholder',
  },
} as const;

export const CellMorphologyGenerationTypeDictionary = Object.fromEntries(
  Object.entries(CellMorphologyGenerationType).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof CellMorphologyGenerationType]: (typeof CellMorphologyGenerationType)[K]['key'];
};

export type TCellMorphologyGenerationType =
  (typeof CellMorphologyGenerationTypeDictionary)[keyof typeof CellMorphologyGenerationTypeDictionary];

export const ModifiedMorphologyMethodType = {
  Cloned: {
    key: 'cloned',
    label: 'Cloned',
  },
  MixAndMatch: {
    key: 'mix_and_match',
    label: 'Mix and match',
  },
  Mousified: {
    key: 'mousified',
    label: 'Mousified',
  },
  Ratified: {
    key: 'ratified',
    label: 'Ratified',
  },
} as const;

export const ModifiedMorphologyMethodTypeDictionary = Object.fromEntries(
  Object.entries(ModifiedMorphologyMethodType).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof ModifiedMorphologyMethodType]: (typeof ModifiedMorphologyMethodType)[K]['key'];
};

export type TModifiedMorphologyMethodType =
  (typeof ModifiedMorphologyMethodTypeDictionary)[keyof typeof ModifiedMorphologyMethodTypeDictionary];

export type CellMorphologyProtocolEntityType = 'cell_morphology_protocol';

export interface ProtocolMixin {
  /** URL link to protocol document or publication */
  protocol_document: string | null; // SerializableHttpUrl → string
  /** Controlled vocabulary (e.g. EM, CellPatch, Fluorophore, Imp) */
  protocol_design: TCellMorphologyProtocolDesign;
}

export interface CellMorphologyProtocolBase extends EntityCoreIdentifiable, ProtocolMixin {
  type: CellMorphologyProtocolEntityType;
  name: string;
  description: string;
  /** Method used for staining. */
  staining_type: TStainingType | null;
  /** Thickness of the slice in microns (>= 0). */
  slicing_thickness: number;
  /** Direction of slicing. */
  slicing_direction: TSlicingDirectionType | null;
  /** Magnification level used (>= 0). */
  magnification: number | null;
  /** Amount tissue shrunk by (>= 0), not the correction factor. */
  tissue_shrinkage: number | null;
  /** Whether data has been corrected for shrinkage. */
  corrected_for_shrinkage: boolean | null;
  generation_type: string;
}

export const CellMorphologyProtocolDesign = {
  EM: {
    key: 'electron_microscopy',
    label: 'Electron microscopy (EM)',
  },
  CellPatch: {
    key: 'cell_patch',
    label: 'Cell patch',
  },
  Fluorophore: {
    key: 'fluorophore',
    label: 'Fluorophore',
  },
  Imp: {
    key: 'topological_synthesis',
    label: 'Topological synthesis',
  },
} as const;

export const CellMorphologyProtocolDesignDictionary = Object.fromEntries(
  Object.entries(CellMorphologyProtocolDesign).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof CellMorphologyProtocolDesign]: (typeof CellMorphologyProtocolDesign)[K]['key'];
};

export type TCellMorphologyProtocolDesign =
  (typeof CellMorphologyProtocolDesignDictionary)[keyof typeof CellMorphologyProtocolDesignDictionary];

export interface DigitalReconstructionCellMorphologyProtocolBase
  extends CellMorphologyProtocolBase,
    ProtocolMixin {
  generation_type: typeof CellMorphologyGenerationType.DigitalReconstruction.key; // 'digital_reconstruction'
}

export interface ModifiedReconstructionCellMorphologyProtocolBase
  extends CellMorphologyProtocolBase,
    ProtocolMixin {
  generation_type: typeof CellMorphologyGenerationType.ModifiedReconstruction.key; // 'modified_reconstruction'
  method_type: TModifiedMorphologyMethodType;
}

export interface ComputationallySynthesizedCellMorphologyProtocolBase
  extends CellMorphologyProtocolBase,
    ProtocolMixin {
  generation_type: typeof CellMorphologyGenerationType.ComputationallySynthesized.key; // 'computationally_synthesized'
  method_type: string;
}

export interface PlaceholderCellMorphologyProtocolBase extends CellMorphologyProtocolBase {
  generation_type: typeof CellMorphologyGenerationType.Placeholder.key; // 'placeholder'
}

export interface NestedDigitalReconstructionCellMorphologyProtocolRead
  extends DigitalReconstructionCellMorphologyProtocolBase {}

export interface NestedModifiedReconstructionCellMorphologyProtocolRead
  extends ModifiedReconstructionCellMorphologyProtocolBase {}

export interface NestedComputationallySynthesizedCellMorphologyProtocolRead
  extends ComputationallySynthesizedCellMorphologyProtocolBase {}

export interface NestedPlaceholderCellMorphologyProtocolRead
  extends PlaceholderCellMorphologyProtocolBase {}

export type NestedCellMorphologyProtocolRead = Prettify<
  | NestedDigitalReconstructionCellMorphologyProtocolRead
  | NestedModifiedReconstructionCellMorphologyProtocolRead
  | NestedComputationallySynthesizedCellMorphologyProtocolRead
  | NestedPlaceholderCellMorphologyProtocolRead
>;

export type CellMorphologyProtocolNestedFilter = {
  cell_morphology_protocol__id: TCellMorphologyGenerationType | null;
  cell_morphology_protocol__id__in:
    | TCellMorphologyGenerationType
    | Array<TCellMorphologyGenerationType>
    | null;
  cell_morphology_protocol__generation_type: TCellMorphologyGenerationType | null;
  cell_morphology_protocol__generation_type__in: Array<TCellMorphologyGenerationType> | null;
};
