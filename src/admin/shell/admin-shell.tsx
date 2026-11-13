'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import ObiLogo from '@/components/logo/obi-logo';
import { Badge, STATUS_PILL_CLASS } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import { hasCapability } from '../capabilities/has-capability';
import { ADMIN_NAV, ADMIN_ROOT, PLATFORM_HOME } from '../routes';

import type { ReactNode } from 'react';
import type { OperatorCapabilities } from '../capabilities/types';

export function AdminShell({
  capabilities,
  children,
}: {
  capabilities: OperatorCapabilities;
  children: ReactNode;
}) {
  const pathname = usePathname();

  const groups = ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasCapability(capabilities, item.need)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="bg-background grid h-screen w-full grid-cols-[14rem_minmax(0,1fr)] grid-rows-[4rem_minmax(0,1fr)] overflow-hidden">
      <header className="border-neutral-2 col-span-2 flex items-center gap-4 border-b bg-white px-5">
        <Link href={ADMIN_ROOT} className="text-primary-9 flex items-center gap-4">
          <ObiLogo className="h-9 w-auto shrink-0" />
          <span className="bg-neutral-2 h-7 w-px shrink-0" />
          <span className="text-xl font-bold">Admin</span>
        </Link>
        <Badge
          rounded
          variant="outline"
          className={cn(STATUS_PILL_CLASS, 'border-warning text-warning bg-white')}
        >
          Operator
        </Badge>
        <Link href={PLATFORM_HOME} className="text-neutral-4 hover:text-primary-9 ml-auto text-sm">
          Back to platform
        </Link>
      </header>

      <nav aria-label="Admin sections" className="flex flex-col gap-4 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <div className="text-neutral-4 px-3 text-sm">{group.label}</div>
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Button
                  key={item.href}
                  rounded
                  borderless
                  asChild
                  variant="outline"
                  size="sm"
                  active={isActive}
                  className={cn(
                    'w-full justify-start font-semibold shadow-none',
                    !isActive && 'hover:bg-neutral-1 hover:text-primary-9 bg-transparent'
                  )}
                >
                  <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        ))}
      </nav>

      <main className="flex min-h-0 min-w-0 flex-col overflow-auto p-6">{children}</main>
    </div>
  );
}
