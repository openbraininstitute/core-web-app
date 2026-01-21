import { parseAsString, type SingleParserBuilder, useQueryState } from 'nuqs';
import { type TWorkspaceScope, WorkspaceScope } from '@/constants';

export function useScope(config?: { defaultScope?: TWorkspaceScope; clearOnDefault?: boolean }) {
  const [scope, changeScope] = useQueryState(
    'scope',
    parseAsString
      .withDefault(config?.defaultScope ?? WorkspaceScope.Public)
      .withOptions({ shallow: true, clearOnDefault: config?.clearOnDefault }) as NonNullable<
      SingleParserBuilder<TWorkspaceScope>
    >
  );

  return { scope, changeScope };
}
