const prefix = 'atlas';

export const keyBuilderAtlas = {
  atlasId: (accessToken: string | undefined) => [prefix, 'atlasID', accessToken ? 'IN' : 'OUT'],
  atlas: (atlasId: string) => [prefix, atlasId],
};

export const keyBuilderHierarchy = {
  hierarchies: () => ['brain-region-hierarchy'],
};
