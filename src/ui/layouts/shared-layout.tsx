'use client';

import { PropsWithChildren } from 'react';
import Image from 'next/image';

import Logo from '@/components/logo/as-svg';

export function SharedLayout({ children }: PropsWithChildren) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50">
      <div className="absolute right-0 bottom-0 h-[285px] w-[503px] opacity-90">
        <Image
          src="/images/brain-visualization.png"
          alt=""
          fill
          className="object-cover object-bottom-right"
          priority
        />
      </div>

      <div className="relative z-10 mx-auto mt-5 flex h-screen w-screen flex-col items-center justify-center md:mt-0">
        <div className="fixed top-6 left-10 md:mb-6">
          <Logo className="text-primary-9" />
        </div>

        {children}
      </div>
    </div>
  );
}
