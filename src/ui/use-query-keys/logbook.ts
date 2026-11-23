const prefix = 'logbook';

const logs = (projectId: string) => [prefix, 'research-logs', { projectId }] as const;

export const keyBuilderLogbook = {
  logs,
  logsPage: (projectId: string, params: string) => [...logs(projectId), { params }] as const,
  log: (projectId: string, id: string) => [prefix, 'research-log', { projectId, id }] as const,
  pages: (logId: string) => [prefix, 'pages', { logId }] as const,
  writers: (pageId: string, clientIds: readonly number[]) =>
    [prefix, 'writers', { pageId, clientIds }] as const,
  activity: (logId: string, openedAt: string) => [prefix, 'activity', { logId, openedAt }] as const,
  contributors: (projectId: string, logId: string) =>
    [prefix, 'contributors', { projectId, logId }] as const,
  files: (logId: string) => [prefix, 'files', { logId }] as const,
  fileText: (logId: string, path: string) => [prefix, 'file-text', { logId, path }] as const,
  fileBlob: (logId: string, path: string) => [prefix, 'file-blob', { logId, path }] as const,
  documentText: (logId: string, assetId: string) =>
    [prefix, 'document-text', { logId, assetId }] as const,
  entity: (type: string, id: string) => [prefix, 'entity', { type, id }] as const,
  entitySearch: (type: string, search: string, projectId: string) =>
    [prefix, 'entity-search', { type, search, projectId }] as const,
  viewer3d: (kind: string, entityId: string) => [prefix, 'viewer-3d', { kind, entityId }] as const,
  picture: (entityId: string, from: string | null) =>
    [prefix, 'picture', { entityId, from }] as const,
  unsentCopies: (userId: string) => [prefix, 'unsent-copies', { userId }] as const,
};
