import { describe, expect, it } from 'vitest';

import { WorkspaceScope } from '@/constants';
import { pinnedScope } from '@/features/data-grid/host/listing-scope';

describe('pinnedScope', () => {
  it('pins a scope given to a listing without a selector', () => {
    expect(pinnedScope({ scope: WorkspaceScope.Combined })).toBe(WorkspaceScope.Combined);
  });

  it('leaves a listing with a selector to the URL', () => {
    expect(
      pinnedScope({ scope: WorkspaceScope.Public, requireScopeSelector: true })
    ).toBeUndefined();
  });

  it('pins nothing when no scope is given', () => {
    expect(pinnedScope({})).toBeUndefined();
  });
});
