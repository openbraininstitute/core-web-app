import Image from 'next/image';

import NewsletterForm from '@/components/coming-soon/newsletter-form';
import Header from '@/components/coming-soon/header';
import Main from '@/components/coming-soon/main';

import { basePath } from '@/config';
import { classNames } from '@/util/utils';

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-primary-9">
      <Header />
      <div className="relative h-svh">
        <Image
          fill
          priority
          alt="coming-soon"
          src={`${basePath}/images/coming-soon/background.webp`}
          className="absolute left-0 top-0 h-svh w-svw  object-cover "
        />
        <main
          className={classNames(
            'relative mx-auto h-svh max-w-3xl',
            'flex flex-col items-center justify-center',
            'px-6 sm:px-12'
          )}
        >
          <div className="flex flex-col items-start justify-start sm:min-w-[40rem] md:min-w-[48rem]">
            <Main />
            <NewsletterForm position="page" key="main-newsletter-form" />
          </div>
        </main>
      </div>
    </div>
  );
}
