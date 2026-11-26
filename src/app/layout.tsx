import 'server-only';

import '@ant-design/v5-patch-for-react-19';
import { DM_Serif_Text, Gabarito, Titillium_Web } from 'next/font/google';
import { type ReactNode, Suspense } from 'react';

import type { Metadata, Viewport } from 'next';

import MatomoAnalyticsConsent from '@/components/Matomo';
import { ConfigProvider, getClientEnvInjectionConfig } from '@/config';
import { APP_ROOT_ATTRIBUTE } from '@/hooks/app-root-attribute';

import '@/styles/globals.css';

const titilliumWeb = Titillium_Web({
  weight: ['300', '400', '600', '700', '900'],
  subsets: ['latin'],
  variable: '--font-titillium-web',
});

const gabarito = Gabarito({
  weight: ['400', '600', '800'],
  subsets: ['latin'],
  variable: '--font-gabarito',
});

const DMSerifText = DM_Serif_Text({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-DMSerifText',
});

type RootLayoutProps = {
  children: ReactNode;
};

/**
 * On a phone's home screen the platform opens as an app of its own, without the browser's bars (the user asked), its
 * icon a white hexagon on navy.
 */
export const metadata: Metadata = {
  appleWebApp: { capable: true, title: 'OBI', statusBarStyle: 'default' },
  icons: { apple: '/images/apple-icon.png' },
};

/** Drawn to the screen's edges, so the tabs along a phone's foot keep clear of its home bar themselves. */
export const viewport: Viewport = { viewportFit: 'cover' };

export default async function RootLayout({ children }: RootLayoutProps) {
  const config = getClientEnvInjectionConfig();

  return (
    <html
      lang="en"
      className={`${titilliumWeb.variable} ${gabarito.variable} ${DMSerifText.variable}`}
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: <false positive>
          dangerouslySetInnerHTML={{
            __html: `window.__ENV__=${JSON.stringify(config)};`,
          }}
        />
      </head>
      <body>
        <ConfigProvider config={config}>
          <div {...{ [APP_ROOT_ATTRIBUTE]: '' }} className="contents">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
          <MatomoAnalyticsConsent />
        </ConfigProvider>
      </body>
    </html>
  );
}
