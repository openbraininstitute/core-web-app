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

/**
 * Get display name for a species, falling back to scientific name
 */
export function getSpeciesDisplayName(scientificName: string): string {
  return SPECIES_DISPLAY_NAMES[scientificName] ?? scientificName;
}

/**
 * Transform API species data to SpeciesInfo with display name
 */
export function transformSpecies(
  hierarchId: string,
  apiSpecies: {
    id: string;
    name: string;
    taxonomy_id: string;
  }
): IWorkspaceSpecies {
  return {
    id: apiSpecies.id,
    name: apiSpecies.name,
    hierarchId,
    displayName: getSpeciesDisplayName(apiSpecies.name),
  };
}
