import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

export const SPECIES_DISPLAY_NAMES: Record<string, string> = {
  'Homo sapiens': 'Human',
  'Mus musculus': 'Mouse',
  'Rattus norvegicus': 'Rat',
  'Aquarana catesbeiana': 'American Bullfrog',
  'Cricetulus griseus': 'Chinese Hamster',
  'Felis catus': 'Cat',
  'Hybrid human-mouse': 'Hybrid Human-Mouse',
  'Loligo pealeii': 'Longfin Squid',
  'Xenopus laevis': 'African Clawed Frog',
  'Drosophila melanogaster': 'Fruit Fly',
} as const;

export const SPECIES_SUBTITLES: Record<string, string> = {
  'Homo sapiens': 'Homo sapiens',
  'Mus musculus': 'Mus musculus',
  'Rattus norvegicus': 'Rattus norvegicus',
  'Aquarana catesbeiana': 'Aquarana catesbeiana',
  'Cricetulus griseus': 'Cricetulus griseus',
  'Felis catus': 'Felis catus',
  'Hybrid human-mouse': 'Hybrid human-mouse',
  'Loligo pealeii': 'Loligo pealeii',
  'Xenopus laevis': 'Xenopus laevis',
  'Drosophila melanogaster': 'Drosophila melanogaster',
} as const;

/**
 * NCBI Taxonomy IDs for supported species
 */
export const SPECIES_TAXONOMY_IDS = {
  HOMO_SAPIENS: 'NCBITaxon:9606',
  MUS_MUSCULUS: 'NCBITaxon:10090',
  RATTUS_NORVEGICUS: 'NCBITaxon:10116',
  AQUARANA_CATESBEIANA: 'NCBITaxon:8400',
  CRICETULUS_GRISEUS: 'NCBITaxon:10029',
  FELIS_CATUS: 'NCBITaxon:9685',
  HYBRID_HUMAN_MOUSE: 'NA',
  LOLIGO_PEALEII: 'NCBITaxon:6619',
  XENOPUS_LAEVIS: 'NCBITaxon:8355',
  DROSOPHILA_MELANOGASTER: 'NCBITaxon:7227',
} as const;

/**
 * mapping of species taxonomy IDs to their placeholder images
 * used when a species does not have a 3D atlas viewer available
 */
export const SPECIES_IMAGE_MAP: Record<string, string> = {
  [SPECIES_TAXONOMY_IDS.AQUARANA_CATESBEIANA]:
    '/images/species/aquarana_catesbeiana__american_bullfrog.png',
  [SPECIES_TAXONOMY_IDS.CRICETULUS_GRISEUS]:
    '/images/species/cricetulus_griseus__chinese_hamster.png',
  [SPECIES_TAXONOMY_IDS.FELIS_CATUS]: '/images/species/felis_catus__domestic_cat.png',
  [SPECIES_TAXONOMY_IDS.LOLIGO_PEALEII]:
    '/images/species/loligo_pealeii__longfin_inshore_squid.png',
  [SPECIES_TAXONOMY_IDS.XENOPUS_LAEVIS]: '/images/species/xenopus_laevis__african_clawed_frog.png',
} as const;

/**
 * species selection mode:
 * - 'focused': a single species/hierarchy is selected and brain-region filters apply
 * - 'all': no species filter and no brain-region filter
 */
export const SpeciesSelectionMode = {
  All: 'all',
  Focused: 'focused',
} as const;

export type TSpeciesSelectionMode =
  (typeof SpeciesSelectionMode)[keyof typeof SpeciesSelectionMode];

/**
 * species information with both scientific and display names
 */
export interface IWorkspaceSpecies {
  id: string;
  name: string;
  taxonomyId: string;
  hierarchId: string;
  displayName: string;
}

/**
 * brain region hierarchy with associated species information
 */
export interface IHierarchyWithSpecies {
  id: string;
  name: string;
  species: IWorkspaceSpecies;
}

/**
 * complete selection state for brain region hierarchy
 * used for persistence in URL, localStorage, and API
 */
export interface BrainRegionHierarchySelection {
  hierarchyId: string;
  speciesName: string;
  brainRegionId: string;
  brainRegionName: string;
  /** per-hierarchy brain region memory for restoring selections when switching species */
  perHierarchyMemory?: Record<string, { brainRegionId: string; brainRegionName: string }>;
  /** selection mode; defaults to 'focused' when absent for backward compatibility */
  speciesSelectionMode?: TSpeciesSelectionMode;
}

/**
 * api request/response shape for brain region preference
 */
export interface IWorkspaceHierarchySpeciesPreference {
  hierarchy_id: string | null;
  species_name: string | null;
  brain_region_id: string | null;
  brain_region_name: string | null;
  /** selection mode; defaults to 'focused' when absent for backward compatibility */
  species_selection_mode?: TSpeciesSelectionMode;
}

export type TBrainRegionHierarchyOption = {
  value: string;
  label: string;
  data: IBrainRegionHierarchy;
};

export type TBrainRegionHierarchyAtomReturnType = {
  root: IBrainRegionHierarchy;
  nodes: IBrainRegionHierarchy | null;
  options: Array<TBrainRegionHierarchyOption>;
  leaves: Map<string, IBrainRegionHierarchy[]>;
} | null;

export interface IBrainRegionHierarchyExtended extends IBrainRegionHierarchy {
  is_leaf_region: boolean;
  volume: number;
  is_volumetric_region: boolean;
  children: Array<IBrainRegionHierarchyExtended>;
}

export type TBrainRegionHierarchyExtendedOption = {
  value: string;
  label: string;
  data: IBrainRegionHierarchyExtended;
};

export type TBrainRegionHierarchyExtendedAtomReturnType = {
  root: IBrainRegionHierarchyExtended;
  nodes: IBrainRegionHierarchyExtended | null;
  options: Array<TBrainRegionHierarchyExtendedOption>;
  leaves: Map<string, IBrainRegionHierarchyExtended[]>;
} | null;
