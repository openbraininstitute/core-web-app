import type { CapabilityPath } from '../capabilities/types';

export const ADMIN_ROOT = '/app/admin';

type AdminNavItem = {
  label: string;
  href: string;
  need: CapabilityPath;
};

export const ADMIN_NAV: { label: string; items: AdminNavItem[] }[] = [
  {
    label: 'Ops',
    items: [{ label: 'Services', href: `${ADMIN_ROOT}/services`, need: 'ops.view' }],
  },
];
