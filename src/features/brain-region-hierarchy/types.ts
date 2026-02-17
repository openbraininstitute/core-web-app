import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

export const SPECIES_DISPLAY_NAMES: Record<string, string> = {
  'Homo sapiens': 'Human',
  'Mus musculus': 'Mouse',
  'Rattus norvegicus': 'Rat',
} as const;

export const SPECIES_SUBTITLES: Record<string, string> = {
  'Homo sapiens': 'Homo sapiens',
  'Mus musculus': 'Mus musculus',
  'Rattus norvegicus': 'Rattus norvegicus',
} as const;

/**
 * NCBI Taxonomy IDs for supported species
 */
export const SPECIES_TAXONOMY_IDS = {
  HOMO_SAPIENS: 'NCBITaxon:9606',
  MUS_MUSCULUS: 'NCBITaxon:10090',
  RATTUS_NORVEGICUS: 'NCBITaxon:10116',
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
