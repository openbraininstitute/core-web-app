'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { useConfig } from '@/config';
import { init, push } from '@/util/matomo';

const DISABLE_ANALYTICS_COOKIE_NAME = 'disable_analytics';

const hasDisableCookie = () =>
  typeof document !== 'undefined' && document.cookie.includes(`${DISABLE_ANALYTICS_COOKIE_NAME}=1`);

function Matomo() {
  const config = useConfig();

  const { MATOMO_URL, MATOMO_CDN_URL, MATOMO_SITE_ID } = config;

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [initialized, setInitialized] = useState(false);

  const searchParamsString = searchParams?.toString();

  const isAnalyticsDisabled =
    hasDisableCookie() || !MATOMO_URL || !MATOMO_SITE_ID || !MATOMO_CDN_URL;

  useEffect(() => {
    if (isAnalyticsDisabled || initialized) return;

    init({
      url: MATOMO_URL,
      cdnUrl: MATOMO_CDN_URL,
      siteId: MATOMO_SITE_ID,
      disableCookies: true,
    });

    return () => {
      setInitialized(true);
    };
  }, [initialized, MATOMO_URL, MATOMO_CDN_URL, MATOMO_SITE_ID, isAnalyticsDisabled]);

  useEffect(() => {
    if (isAnalyticsDisabled || !pathname) return;
    const url = `${pathname}${searchParamsString ? '?' + decodeURIComponent(searchParamsString) : ''}`;
    push(['setCustomUrl', url]);
    push(['trackPageView']);
  }, [pathname, searchParamsString, isAnalyticsDisabled]);

  return null;
}

export default function MatomoAnalyticsConsent() {
  return (
    <Suspense>
      <Matomo />
    </Suspense>
  );
}
