'use client';

import { type ReactNode, useEffect, useState } from 'react';

export function HydrateWrapper({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return null;
  return <>{children}</>;
}

export default HydrateWrapper;
