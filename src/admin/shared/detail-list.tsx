import type { ReactNode } from 'react';

export function DetailList({ children }: { children: ReactNode }) {
  return (
    <dl className="border-neutral-2 grid grid-cols-[12rem_minmax(0,1fr)] gap-x-6 gap-y-3 rounded-lg border bg-white p-5">
      {children}
    </dl>
  );
}

export function Detail({ label, children }: { label: string; children: ReactNode }) {
  const empty =
    children === null || children === undefined || children === false || children === '';

  return (
    <>
      <dt className="text-neutral-4">{label}</dt>
      <dd className="text-primary-9 min-w-0 break-words">{empty ? '—' : children}</dd>
    </>
  );
}

export function DetailId({ children }: { children: string }) {
  return <span className="font-mono text-sm">{children}</span>;
}
