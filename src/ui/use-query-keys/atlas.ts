const prefix = 'atlas';

export const keyBuilderAtlas = {
  atlasId: (accessToken: string | undefined) => [prefix, 'atlasID', accessToken ? 'IN' : 'OUT'],
  atlas: (atlasId: string) => [prefix, atlasId],
};
