export const HELP_QUERY_KEYS = {
  entitycore: (cellType: 'e-type' | 'm-type', name: string) =>
    ['entitycore', cellType, name] as const,
  entityTypes: (
    cellType: 'e-type' | 'm-type',
    activePage: number,
    pageSize: number,
    filter?: any
  ) => ['entityTypes', cellType, activePage, pageSize, filter] as const,
};
