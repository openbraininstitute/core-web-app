'use client';

import { useEffect, useState } from 'react';

import NewsletterForm from '@/components/coming-soon/newsletter-form';
import Header from '@/components/coming-soon/header';
import Main from '@/components/coming-soon/main';
import Hero from '@/components/coming-soon/hero';
import { classNames } from '@/util/utils';

export default function Page() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!hydrated) return null;
  return (
    <div className="relative min-h-screen overflow-hidden bg-primary-9">
      <Header />
      <div className="relative h-svh">
        <Hero />
        <main
          className={classNames(
            'absolute inset-0 z-50 mx-auto h-svh max-w-3xl',
            'flex flex-col items-center justify-center',
            'px-6 sm:px-12'
          )}
        >
          <div className="flex w-full min-w-full flex-col items-start justify-start">
            <Main />
            <NewsletterForm key="main-newsletter-form" />
          </div>
        </main>
      </div>
      <div className="absolute bottom-3 left-3 z-50 px-2 py-2 text-base text-white shadow-md md:px-[19px]">
        Copyright &copy; {new Date().getFullYear()} – Open Brain Institute
      </div>
    </div>
  );
}
