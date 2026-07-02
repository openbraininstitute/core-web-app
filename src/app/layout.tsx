import 'server-only';

import '@ant-design/v5-patch-for-react-19';
import { DM_Serif_Text, Gabarito, Titillium_Web } from 'next/font/google';
import { type ReactNode, Suspense } from 'react';

import MatomoAnalyticsConsent from '@/components/Matomo';
import { AppToaster } from '@/components/notification';
import { ConfigProvider, getClientEnvInjectionConfig } from '@/config';

import '@/styles/globals.css';

const titilliumWeb = Titillium_Web({
  weight: ['300', '400', '600', '700'],
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
          <Suspense fallback={null}>{children}</Suspense>
          <AppToaster />
          <MatomoAnalyticsConsent />
        </ConfigProvider>
      </body>
    </html>
  );
}
