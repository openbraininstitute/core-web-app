import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

export const SPECIES_DISPLAY_NAMES: Record<string, string> = {
  'Homo sapiens': 'Human',
  'Mus musculus': 'Mouse',
} as const;

/**
 * NCBI Taxonomy IDs for supported species
 */
export const SPECIES_TAXONOMY_IDS = {
  HOMO_SAPIENS: 'NCBITaxon:9606',
  MUS_MUSCULUS: 'NCBITaxon:10090',
} as const;

/**
 * Species information with both scientific and display names
 */
export interface IWorkspaceSpecies {
  id: string;
  name: string;
  hierarchId: string;
  displayName: string;
}

/**
 * Brain region hierarchy with associated species information
 */
export interface IHierarchyWithSpecies {
  id: string;
  name: string;
  species: IWorkspaceSpecies;
}

/**
 * Complete selection state for brain region hierarchy
 * Used for persistence in URL, localStorage, and API
 */
export interface BrainRegionHierarchySelection {
  hierarchyId: string;
  speciesName: string;
  brainRegionId: string;
  brainRegionName: string;
  /** Per-hierarchy brain region memory for restoring selections when switching species */
  perHierarchyMemory?: Record<string, { brainRegionId: string; brainRegionName: string }>;
}

/**
 * API request/response shape for brain region preference
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
