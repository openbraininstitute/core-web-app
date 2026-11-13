import { BreadcrumbTrail } from '@/ui/molecules/breadcrumb';

import { StatusPill } from './status-pill';

import type { ReactNode } from 'react';

export function PageHeader({
  title,
  parent,
  deleted,
  actions,
  children,
}: {
  title: string;
  parent?: { label: string; href: string };
  deleted?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {parent && (
        <BreadcrumbTrail
          items={[
            { key: 'parent', label: parent.label, href: parent.href },
            { key: 'current', label: title },
          ]}
        />
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="text-primary-9 truncate text-xl font-bold">{title}</h1>
          {deleted && <StatusPill tone="bad">Deleted</StatusPill>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="text-neutral-4 max-w-3xl">{children}</div>}
    </div>
  );
}
