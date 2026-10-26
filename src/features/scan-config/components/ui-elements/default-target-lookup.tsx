'use client';

import { useDefaultLookup } from '@/features/scan-config/bridge/default-lookup-context';

import type { ReactNode } from 'react';

/**
 * Wraps a field's picker. While the editor reports a lookup for `fieldPath` (see
 * `bridge/default-lookup-context`) and nothing is selected, it renders a single shimmering pill in
 * place of the picker; otherwise the picker, untouched. It knows no workflow: fields nobody
 * publishes for render as before.
 */
export function DefaultTargetLookup({
  fieldPath,
  hasValue,
  children,
}: {
  fieldPath: string | undefined;
  hasValue: boolean;
  children: ReactNode;
}) {
  const lookup = useDefaultLookup(fieldPath);
  if (!lookup || hasValue) return <>{children}</>;

  const { title, detail } = lookup;
  return (
    <div
      role="status"
      className="from-neutral-1 via-primary-0 to-neutral-1 animate-shimmer border-neutral-2 flex h-11 w-full cursor-progress items-center gap-3 overflow-hidden rounded-full border bg-gradient-to-r bg-[length:200%_100%] px-4"
    >
      <span
        aria-hidden
        className="border-primary-8/25 border-t-primary-8 size-4 shrink-0 animate-spin rounded-full border-2"
      />
      <span className="truncate text-sm">
        <span className="text-primary-9 font-medium">{title}</span>
        {detail ? <span className="text-gray-500"> · {detail}</span> : null}
      </span>
    </div>
  );
}
