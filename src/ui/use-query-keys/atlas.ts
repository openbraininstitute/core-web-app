const prefix = "atlas";

export const keyBuilderAtlas = {
  atlas: ({
    atlasId,
    page,
    page_size,
  }: {
    atlasId: string;
    page: number;
    page_size: number;
  }) => [prefix, { atlasId, page, page_size }],
  defaultBrainAtlas: () => [prefix, "default-brain-atlas"],
};

export const keyBuilderHierarchy = {
  hierarchy: (id: string) => ["brain-region-hierarchy", { id }],
  hierarchies: () => ["brain-region-hierarchies"],
  hierarchyPreference: () => ["brain-region-hierarchy-preference"],
};
