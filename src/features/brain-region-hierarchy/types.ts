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
} as const;

/**
 * mapping of species taxonomy IDs to their placeholder images
 * used when a species does not have a 3D atlas viewer available
 */
export const SPECIES_IMAGE_MAP: Record<string, string> = {
  [SPECIES_TAXONOMY_IDS.AQUARANA_CATESBEIANA]:
    '/images/species/577954268-916b2f0b-0304-4ac0-b170-e226cb3f812a.png',
  [SPECIES_TAXONOMY_IDS.CRICETULUS_GRISEUS]:
    '/images/species/577954269-d639b6f1-f7f3-4a0f-9eb0-ca6573594595.png',
  [SPECIES_TAXONOMY_IDS.FELIS_CATUS]:
    '/images/species/577954498-5ee17174-8166-420d-a05a-135745a65ba7.png',
  [SPECIES_TAXONOMY_IDS.LOLIGO_PEALEII]:
    '/images/species/577954499-9071cece-f533-41dc-b527-c5c325b2f935.png',
  [SPECIES_TAXONOMY_IDS.XENOPUS_LAEVIS]:
    '/images/species/577954564-c36d6524-edf0-4dca-acba-40a373269075.png',
} as const;

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
}

/**
 * api request/response shape for brain region preference
 */
export interface IWorkspaceHierarchySpeciesPreference {
  hierarchy_id: string;
  species_name: string;
  brain_region_id: string | null;
  brain_region_name: string | null;
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
