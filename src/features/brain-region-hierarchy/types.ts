export const SPECIES_DISPLAY_NAMES: Record<string, string> = {
  "Homo sapiens": "Human",
  "Mus musculus": "Mouse",
  "Rattus norvegicus": "Rat",
} as const;

/**
 * NCBI Taxonomy IDs for supported species
 */
export const SPECIES_TAXONOMY_IDS = {
  HOMO_SAPIENS: "NCBITaxon:9606",
  MUS_MUSCULUS: "NCBITaxon:10090",
} as const;

/**
 * Species information with both scientific and display names
 */
export interface ISpeciesInfo {
  id: string;
  name: string;
  hierarchId: string;
  displayName: string;
  taxonomyId: string;
}

/**
 * Brain region hierarchy with associated species information
 */
export interface HierarchyWithSpecies {
  id: string;
  name: string;
  species: ISpeciesInfo;
}

/**
 * Complete selection state for brain region hierarchy
 * Used for persistence in URL, localStorage, and API
 */
export interface BrainRegionHierarchySelection {
  hierarchyId: string;
  speciesTaxonomyId: string;
  brainRegionId: string;
  brainRegionAnnotationValue: number;
}

/**
 * API request/response shape for brain region preference
 */
export interface IBrainRegionPreference {
  hierarchy_id: string;
  species_taxonomy_id: string;
  brain_region_id: string | null;
  brain_region_annotation_value: number | null;
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
  },
): ISpeciesInfo {
  return {
    id: apiSpecies.id,
    name: apiSpecies.name,
    hierarchId,
    displayName: getSpeciesDisplayName(apiSpecies.name),
    taxonomyId: apiSpecies.taxonomy_id,
  };
}
