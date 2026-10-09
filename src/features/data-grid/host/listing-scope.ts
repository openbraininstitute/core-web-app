'use client';

import { useScope } from '@/ui/hooks/use-scope';

import type { TWorkspaceScope } from '@/constants';

type TListingScopeProps = { scope?: TWorkspaceScope; requireScopeSelector?: boolean };

/** A scope given to a listing with no selector to change it, so the URL cannot. */
export function pinnedScope({ scope, requireScopeSelector }: TListingScopeProps) {
  return requireScopeSelector ? undefined : scope;
}

/** The listing's pinned scope, else the URL's, which its scope selector writes. */
export function useListingScope(props: TListingScopeProps): TWorkspaceScope {
  const { scope } = useScope({ defaultScope: props.scope, clearOnDefault: false });
  return pinnedScope(props) ?? scope;
}
