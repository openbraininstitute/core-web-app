import { parseAsString, type SingleParserBuilder, useQueryState } from 'nuqs';
import { useTransition } from 'react';
import { type TWorkspaceScope, WorkspaceScope } from '@/constants';

export const SCOPE_QUERY_PARAMS = 'scope';

export function useScope(config?: { defaultScope?: TWorkspaceScope; clearOnDefault?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [scope, setScope] = useQueryState(
    SCOPE_QUERY_PARAMS,
    parseAsString.withDefault(config?.defaultScope ?? WorkspaceScope.Public).withOptions({
      shallow: true,
      clearOnDefault: config?.clearOnDefault,
      startTransition,
    }) as NonNullable<SingleParserBuilder<TWorkspaceScope>>
  );

  return { scope, changeScope: setScope, isPending };
}
