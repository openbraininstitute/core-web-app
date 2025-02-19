import { ReactNode, Suspense } from 'react';
import { Gabarito, Titillium_Web, DM_Serif_Text } from 'next/font/google';

import Providers from './providers';
import MatomoAnalyticsConsent from '@/components/Matomo';
import { auth } from '@/auth';

import '@/styles/globals.scss';

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
  const session = await auth();
  return (
    <html
      lang="en"
      className={`${titilliumWeb.variable} ${gabarito.variable} ${DMSerifText.variable}`}
    >
      <body>
        <Providers session={session}>
          <Suspense fallback={null}>{children}</Suspense>
          <MatomoAnalyticsConsent />
          {/* <Feedback /> */}
        </Providers>
      </body>
    </html>
  );
}
