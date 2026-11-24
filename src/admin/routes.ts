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
      { label: 'Courses', href: `${ADMIN_ROOT}/courses`, need: 'education.admin' },
      { label: 'Institutions', href: `${ADMIN_ROOT}/institutions`, need: 'education.admin' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { label: 'Subscriptions', href: `${ADMIN_ROOT}/subscriptions`, need: 'virtualLab.read' },
      { label: 'Payments', href: `${ADMIN_ROOT}/payments`, need: 'virtualLab.read' },
      { label: 'Plans and rates', href: `${ADMIN_ROOT}/plans`, need: 'virtualLab.read' },
      { label: 'Promotions', href: `${ADMIN_ROOT}/promotions`, need: 'promotions.admin' },
    ],
  },
  {
    label: 'Accounting',
    items: [
      { label: 'Accounts', href: `${ADMIN_ROOT}/accounting/accounts`, need: 'accounting.admin' },
      { label: 'Jobs', href: `${ADMIN_ROOT}/accounting/jobs`, need: 'accounting.admin' },
      { label: 'Journal', href: `${ADMIN_ROOT}/accounting/journal`, need: 'accounting.admin' },
      { label: 'Reports', href: `${ADMIN_ROOT}/accounting/reports`, need: 'accounting.admin' },
      {
        label: 'Discounts',
        href: `${ADMIN_ROOT}/accounting/discounts`,
        need: 'accounting.admin',
      },
    ],
  },
  {
    label: 'Ops',
    items: [
      { label: 'Services', href: `${ADMIN_ROOT}/services`, need: 'admin.access' },
      { label: 'Simulator caches', href: `${ADMIN_ROOT}/simulator`, need: 'simulator.admin' },
      { label: 'Job lookup', href: `${ADMIN_ROOT}/jobs`, need: 'launchSystem.admin' },
    ],
  },
];
