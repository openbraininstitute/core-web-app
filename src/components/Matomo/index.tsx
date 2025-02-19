'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { CookieNotice } from '@/components/Matomo/consent';
import { init, push } from '@/util/matomo';
import { env } from '@/env.mjs';

const MATOMO_URL = env.NEXT_PUBLIC_MATOMO_URL;
const MATOMO_CDN_URL = env.NEXT_PUBLIC_MATOMO_CDN_URL;
const MATOMO_SITE_ID = env.NEXT_PUBLIC_MATOMO_SITE_ID;
const CONSENT_SID = 'c_sid';

function Matomo() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const searchParamsString = searchParams.toString();
  const openConsent = useCallback(() => setIsOpen(true), []);

  const onAccept = () => {
    if (MATOMO_URL && MATOMO_SITE_ID && MATOMO_CDN_URL) {
      init({
        url: MATOMO_URL,
        cdnUrl: MATOMO_CDN_URL,
        siteId: MATOMO_SITE_ID,
        disableCookies: false,
      });
      localStorage.setItem(
        CONSENT_SID,
        JSON.stringify({
          id: crypto.randomUUID(),
          lastUpdated: Math.floor(Date.now() / 1000),
          r: true,
        })
      );
      setIsOpen(false);
    }
  };

  const onDecline = () => {
    localStorage.setItem(
      CONSENT_SID,
      JSON.stringify({
        id: crypto.randomUUID(),
        lastUpdated: Math.floor(Date.now() / 1000),
        r: false,
      })
    );
    setIsOpen(false);
  };

  useEffect(() => {
    const savedConsent = localStorage.getItem(CONSENT_SID);
    if (!savedConsent) openConsent();
  }, [openConsent]);

  useEffect(() => {
    if (!pathname) return;
    const url = `${pathname}${searchParamsString ? '?' + decodeURIComponent(searchParamsString) : ''}`;
    push(['setCustomUrl', url]);
    push(['trackPageView']);
  }, [pathname, searchParamsString]);

  useEffect(() => {
    try {
      const savedConsent = localStorage.getItem(CONSENT_SID);
      if (savedConsent) {
        const consentParsed = JSON.parse(savedConsent);
        if (consentParsed.r) {
          if (MATOMO_URL && MATOMO_SITE_ID && MATOMO_CDN_URL) {
            init({
              url: MATOMO_URL,
              cdnUrl: MATOMO_CDN_URL,
              siteId: MATOMO_SITE_ID,
              disableCookies: false,
            });
          }
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('failed to parse the consent');
    }
  }, []);

  return <CookieNotice isOpen={isOpen} onAccept={onAccept} onDecline={onDecline} />;
}

export default function MatomoAnalyticsConsent() {
  return (
    <Suspense>
      <Matomo />
    </Suspense>
  );
}
