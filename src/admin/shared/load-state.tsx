import { errorReason, isForbidden } from './errors';

import type { ReactNode } from 'react';

export function LoadFailure({ error, what }: { error: unknown; what: string }) {
  return (
    <p className="text-neutral-4 p-5">
      {isForbidden(error)
        ? `Your account can't read ${what}.`
        : `Couldn't load ${what}. ${errorReason(error)}`}
    </p>
  );
}

export function Loaded<T>({
  query: { data, error },
  what,
  children,
}: {
  query: { data: T | undefined; error: unknown };
  what: string;
  children: (data: T) => ReactNode;
}) {
  if (data !== undefined) return children(data);
  if (error) return <LoadFailure error={error} what={what} />;

  return <p className="text-neutral-4 p-5">Loading {what}</p>;
}
