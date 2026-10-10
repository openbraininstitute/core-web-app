import { describe, expect, it } from 'vitest';

import { WorkspaceScope } from '@/constants';
import { listingScope } from '@/features/data-grid/host/listing-scope';

describe('listingScope', () => {
  it('fetches both scopes for a listing with a scope selector', () => {
    expect(listingScope({ requireScopeSelector: true })).toBe(WorkspaceScope.Combined);
  });

  it('keeps a given scope as the namespace of a listing with a selector', () => {
    expect(
      listingScope({ scope: WorkspaceScope.BuildIonChannelModel, requireScopeSelector: true })
    ).toBe(WorkspaceScope.BuildIonChannelModel);
  });

  it('fetches the given scope, else public, for a listing without one', () => {
    expect(listingScope({ scope: WorkspaceScope.Combined })).toBe(WorkspaceScope.Combined);
    expect(listingScope({})).toBe(WorkspaceScope.Public);
  });
});
