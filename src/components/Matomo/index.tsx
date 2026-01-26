'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { init, push } from '@/util/matomo';
import { useConfig } from '@/config';

function Matomo() {
  const config = useConfig();

  const { MATOMO_URL, MATOMO_CDN_URL, MATOMO_SITE_ID } = config;

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [initialized, setInitialized] = useState(false);

  const searchParamsString = searchParams?.toString();

  useEffect(() => {
    if (MATOMO_URL && MATOMO_SITE_ID && MATOMO_CDN_URL && !initialized) {
      init({
        url: MATOMO_URL,
        cdnUrl: MATOMO_CDN_URL,
        siteId: MATOMO_SITE_ID,
        disableCookies: true,
      });
    }

    return () => {
      setInitialized(true);
    };
  }, [initialized, setInitialized, MATOMO_URL, MATOMO_CDN_URL, MATOMO_SITE_ID]);

  useEffect(() => {
    if (!pathname) return;
    const url = `${pathname}${searchParamsString ? '?' + decodeURIComponent(searchParamsString) : ''}`;
    push(['setCustomUrl', url]);
    push(['trackPageView']);
  }, [pathname, searchParamsString]);

  return null;
}

export default function MatomoAnalyticsConsent() {
  return (
    <Suspense>
      <Matomo />
    </Suspense>
  );
}
