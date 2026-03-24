export function createRemoteSuggestionCacheKey(fieldPath: string, query: string): string {
  return `${fieldPath}::${query.trim().toLowerCase()}`;
}
