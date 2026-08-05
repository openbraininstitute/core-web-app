'use client';

import { useSetAtom } from 'jotai';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { lastSectionLocationAtom, PRESERVED_LOCATION_SECTIONS } from '@/state/section-location';
import { getActiveSection } from '@/utils/get-section';

/**
 * Records the last visited URL of the sections in
 * {@link PRESERVED_LOCATION_SECTIONS} so the top-menu tabs can link back to
 * it. Renders nothing; must sit under a Suspense boundary because of
 * useSearchParams.
 */
export function SectionLocationRecorder() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setLastLocation = useSetAtom(lastSectionLocationAtom);

  useEffect(() => {
    const section = getActiveSection(pathname);
    if (!section || !PRESERVED_LOCATION_SECTIONS.has(section)) return;

    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    setLastLocation((previous) =>
      previous[section] === url ? previous : { ...previous, [section]: url }
    );
  }, [pathname, searchParams, setLastLocation]);

  return null;
}
