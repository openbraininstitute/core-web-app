const prefix = 'help';

export const HELP_QUERY_KEYS = {
  entitycore: (cellType: 'e-type' | 'm-type', name: string) =>
    [prefix, 'entitycore', cellType, name] as const,
  entityTypes: (
    cellType: 'e-type' | 'm-type',
    activePage: number,
    pageSize: number,
    filter?: any
  ) => [prefix, 'entityTypes', cellType, activePage, pageSize, filter] as const,
};
