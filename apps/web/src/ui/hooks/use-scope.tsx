import { parseAsString, type SingleParserBuilder, useQueryState } from 'nuqs';
import { useTransition } from 'react';

import { SCOPE_QUERY_PARAMS, type TWorkspaceScope, WorkspaceScope } from '@/constants';

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

  return { scope: scope ?? WorkspaceScope.Public, changeScope: setScope, isPending };
}
