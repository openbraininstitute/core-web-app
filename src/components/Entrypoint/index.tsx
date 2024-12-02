'use client';

import { Metadata } from 'next';

import Head from 'next/head';
import Footer from '../AboutSFN/Blocs/Footer';
import HeaderScreen from '../home/screens/HeaderScreen';
import ScreenBBGithub from '../home/screens/ScreenBBGithub';
import ScreenContributors from '../home/screens/ScreenContributors';
import { AcceptInviteErrorDialog, Menu } from './segments';

import { basePath } from '@/config';

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
};

export default function Entrypoint({
  errorCode,
  callbackUrl,
}: {
  errorCode?: string;
  callbackUrl?: string;
}) {
  return (
    <>
      <Head>
        <link rel="canonical" href="https://www.openbrainplatform.com" />
      </Head>
      <div className="relative flex w-screen flex-col bg-primary-9">
        <Menu callbackUrl={callbackUrl} />
        <div className="h-auto overflow-x-hidden overflow-y-scroll md:h-screen md:snap-y md:snap-mandatory">
          <HeaderScreen />
          <ScreenBBGithub />
          {/* TODO: Re-enable once the page on AWS is available */}
          {/* <ScreenOpenData /> */}
          <ScreenContributors />
          <Footer className="snap-start snap-always" />
        </div>
        {errorCode && <AcceptInviteErrorDialog errorCode={errorCode} />}
      </div>
    </>
  );
}
