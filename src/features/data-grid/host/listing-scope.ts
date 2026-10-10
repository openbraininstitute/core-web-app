import { type TWorkspaceScope, WorkspaceScope } from '@/constants';

type TListingScopeProps = { scope?: TWorkspaceScope; requireScopeSelector?: boolean };

/** Both scopes for a listing with a selector (`scope` then only names its state), else `scope`. */
export function listingScope({ scope, requireScopeSelector }: TListingScopeProps) {
  if (requireScopeSelector) return scope ?? WorkspaceScope.Combined;
  return scope ?? WorkspaceScope.Public;
}
