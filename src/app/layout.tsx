import 'server-only';

import '@ant-design/v5-patch-for-react-19';
import { DM_Serif_Text, Gabarito, Titillium_Web } from 'next/font/google';
import { type ReactNode, Suspense } from 'react';

import MatomoAnalyticsConsent from '@/components/Matomo';
import { ConfigProvider, getClientEnvInjectionConfig } from '@/config';
import { clientSchema } from '@/config/schema';

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
  // Get the injected config object (reads from process.env on server)
  const injectedEnv = getClientEnvInjectionConfig();
  
  // Validate and parse the injected config through the schema
  // This ensures it matches ClientConfig type and handles optional values correctly
  const parsedConfig = clientSchema.parse(injectedEnv);
  
  return (
    <html
      lang="en"
      className={`${titilliumWeb.variable} ${gabarito.variable} ${DMSerifText.variable}`}
      data-scroll-behavior="smooth"
    >
      <head>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `window.__ENV__=${JSON.stringify(injectedEnv)};`,
          }}
        />
      </head>
      <body>
        {/* Pass the parsed config which matches ClientConfig type */}
        <ConfigProvider config={parsedConfig}>
          <Suspense fallback={null}>{children}</Suspense>
          <MatomoAnalyticsConsent />
        </ConfigProvider>
      </body>
    </html>
  );
}
