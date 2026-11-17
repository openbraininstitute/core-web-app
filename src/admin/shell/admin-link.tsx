import Link from 'next/link';

import { cn } from '@/utils/css-class';

import { ADMIN_ROOT } from '../routes';

import type { ReactNode } from 'react';

const ROUTES = {
  vlab: 'virtual-labs',
  project: 'projects',
  user: 'users',
};

export function adminHref(kind: keyof typeof ROUTES, id: string) {
  return `${ADMIN_ROOT}/${ROUTES[kind]}/${encodeURIComponent(id)}`;
}

// Without a label the id is shortened, in mono, with the whole id on hover.
export function AdminLink({
  kind,
  id,
  label,
}: {
  kind: keyof typeof ROUTES;
  id: string | null | undefined;
  label?: ReactNode;
}) {
  if (!id) return <span className="text-neutral-4">—</span>;

  return (
    <Link
      href={adminHref(kind, id)}
      title={id}
      className={cn('text-primary-9 hover:underline', !label && 'font-mono text-sm')}
    >
      {label ?? `${id.slice(0, 8)}…`}
    </Link>
  );
}
