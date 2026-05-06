const prefix = 'atlas';
export const keyBuilderAtlas = {
  atlas: ({ atlasId }: { atlasId: string }) => [prefix, { atlasId }],
  byId: (atlasId: string) => [prefix, 'by-id', { atlasId }],
  all: () => [prefix, 'all'],
};

const hierarchyPrefix = 'brain-region-hierarchy-with-species';
export const keyBuilderHierarchy = {
  hierarchy: ({ id }: { id: string }) => [`${hierarchyPrefix}/one`, { id }],
  hierarchies: () => [`${'brain-region-hierarchies'}/all`],
  hierarchyPreference: () => [`${hierarchyPrefix}/user-preference`],
};

const cellCompositionPrefix = 'cell-composition';
export const cellCompositionKeyBuilder = {
  summary: () => [`${cellCompositionPrefix}/summary`],
  summaryAsset: (id: string) => [`${cellCompositionPrefix}/summary/asset`, { id }],
};
