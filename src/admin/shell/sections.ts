import type { CapabilityPath } from '../capabilities/types';

export const ADMIN_ROOT = '/app/admin';

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
      { label: 'Courses', href: `${ADMIN_ROOT}/courses`, need: 'virtualLab.admin' },
      { label: 'Institutions', href: `${ADMIN_ROOT}/institutions`, need: 'virtualLab.admin' },
    ],
  },
  {
    label: 'Money',
    items: [
      { label: 'Subscriptions', href: `${ADMIN_ROOT}/subscriptions`, need: 'virtualLab.read' },
      { label: 'Payments', href: `${ADMIN_ROOT}/payments`, need: 'virtualLab.read' },
      { label: 'Plans and rates', href: `${ADMIN_ROOT}/plans`, need: 'virtualLab.read' },
      { label: 'Promotions', href: `${ADMIN_ROOT}/promotions`, need: 'promotions.admin' },
    ],
  },
  {
    label: 'Ops',
    items: [{ label: 'Services', href: `${ADMIN_ROOT}/services`, need: 'ops.view' }],
  },
];
