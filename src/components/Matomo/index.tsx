'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { init, push } from '@/util/matomo';
import { env } from '@/env.mjs';

const MATOMO_URL = env.NEXT_PUBLIC_MATOMO_URL;
const MATOMO_CDN_URL = env.NEXT_PUBLIC_MATOMO_CDN_URL;
const MATOMO_SITE_ID = env.NEXT_PUBLIC_MATOMO_SITE_ID;

function Matomo() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [initialized, setInitialized] = useState(false);

  const searchParamsString = searchParams.toString();

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
  }, [initialized, setInitialized]);

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
