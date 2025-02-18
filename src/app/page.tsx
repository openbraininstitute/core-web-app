import { Metadata } from 'next';

// import Entrypoint from '@/components/Entrypoint';
import ComingSoon from './_coming-soon/page';
import { basePath } from '@/config';
// import LandingPage from '@/components/LandingPage';
// import { EnumSection } from '@/components/LandingPage/sections/sections';

export const metadata: Metadata = {
  title: 'Open Brain Platform',
  description: 'Virtual labs to explore, build and simulate the brain',
  keywords: [
    'blue',
    'institute',
    'platform',
    'explore',
    'build',
    'model',
    'simulate',
    'brain',
    'simulation',
    'neuroscience',
    'virtual labs',
    'circuit',
    'cellular',
    'system',
  ],
  authors: [{ name: 'Open Brain Institute', url: 'https://www.openbraininstitute.org' }],
  openGraph: {
    title: 'Open Brain Institute',
    description: 'Virtual labs to explore, build and simulate the brain',
    authors: ['Open Brain Institute'],
    images: [
      {
        url: `${basePath}/images/opengraph/OBP_OGImage.jpg`,
        width: 800,
        height: 500,
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: true,
    },
  },
  metadataBase: new URL('https://www.openbrainplatform.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
    },
  },
};

export default function RootPage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  searchParams,
}: {
  searchParams: { errorcode: string | undefined };
}) {
  return <ComingSoon />;
  // <LandingPage section={EnumSection.Home} errorCode={searchParams.errorcode} />;
  // return <Entrypoint errorCode={searchParams.errorcode} />;
}
