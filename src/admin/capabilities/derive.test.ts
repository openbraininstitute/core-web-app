import { describe, expect, it } from 'vitest';

import { deriveCapabilities } from './derive';
import { hasCapability } from './has-capability';
import {
  ACCOUNTING_ADMIN_GROUP,
  ENTITYCORE_ADMIN_GROUP,
  LAUNCH_SYSTEM_ADMIN_GROUP,
  SIMULATOR_ADMIN_GROUP,
  VLAB_ADMIN_GROUP,
  VLAB_MAINTAINER_GROUP,
  WILDCARD_ADMIN_GROUP,
} from './registry';

import type { OperatorCapabilities } from './types';

const ALL_FALSE: OperatorCapabilities = {
  entitycore: { admin: false, assetWrite: false },
  virtualLab: { read: false, admin: false },
  promotions: { admin: false },
  accounting: { admin: false },
  simulator: { admin: false },
  launchSystem: { admin: false },
  ops: { view: false },
};

describe('deriveCapabilities', () => {
  it('grants nothing for no groups or unknown groups', () => {
    expect(deriveCapabilities([])).toEqual(ALL_FALSE);
    expect(
      deriveCapabilities([
        '/vlab/some-uuid/admin',
        '/proj/a/b/member',
        '/service/not-a-real-service/admin',
        'garbage',
      ])
    ).toEqual(ALL_FALSE);
  });

  it.each<[string, string, Partial<OperatorCapabilities>]>([
    ['entitycore admin', ENTITYCORE_ADMIN_GROUP, { entitycore: { admin: true, assetWrite: true } }],
    ['vlab maintainer', VLAB_MAINTAINER_GROUP, { virtualLab: { read: true, admin: false } }],
    [
      'vlab admin',
      VLAB_ADMIN_GROUP,
      { virtualLab: { read: true, admin: true }, promotions: { admin: true } },
    ],
    ['accounting admin', ACCOUNTING_ADMIN_GROUP, { accounting: { admin: true } }],
    ['simulator admin', SIMULATOR_ADMIN_GROUP, { simulator: { admin: true } }],
    ['launch-system admin', LAUNCH_SYSTEM_ADMIN_GROUP, { launchSystem: { admin: true } }],
  ])('%s grants only its own leaves, plus ops.view', (_name, group, expected) => {
    expect(deriveCapabilities([group])).toEqual({
      ...ALL_FALSE,
      ...expected,
      ops: { view: true },
    });
  });

  it('wildcard grants entitycore, simulator and accounting, and no literal-only leaf', () => {
    expect(deriveCapabilities([WILDCARD_ADMIN_GROUP])).toEqual({
      ...ALL_FALSE,
      entitycore: { admin: true, assetWrite: false },
      accounting: { admin: true },
      simulator: { admin: true },
      ops: { view: true },
    });
  });
});

describe('hasCapability', () => {
  it('reads a leaf by dot-path', () => {
    const caps = deriveCapabilities([VLAB_ADMIN_GROUP]);
    expect(hasCapability(caps, 'virtualLab.admin')).toBe(true);
    expect(hasCapability(caps, 'accounting.admin')).toBe(false);
    expect(hasCapability(caps, 'ops.view')).toBe(true);
  });
});
