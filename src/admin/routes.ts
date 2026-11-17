import type { CapabilityPath } from './capabilities/types';

export const ADMIN_ROOT = '/app/admin';
export const PLATFORM_HOME = '/app/virtual-lab/sync';

type AdminNavItem = {
  label: string;
  href: string;
  need: CapabilityPath;
};

export const ADMIN_NAV: { label: string; items: AdminNavItem[] }[] = [
  {
    label: 'Tenancy',
    items: [
      { label: 'Virtual labs', href: `${ADMIN_ROOT}/virtual-labs`, need: 'virtualLab.read' },
      { label: 'Projects', href: `${ADMIN_ROOT}/projects`, need: 'virtualLab.read' },
      { label: 'Users', href: `${ADMIN_ROOT}/users`, need: 'virtualLab.read' },
    ],
  },
  {
    label: 'Ops',
    items: [{ label: 'Services', href: `${ADMIN_ROOT}/services`, need: 'admin.access' }],
  },
];
