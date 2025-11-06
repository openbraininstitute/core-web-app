'use client';

import Image from 'next/image';
import Logo from '@/components/logo/as-svg';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50">
      <div className="absolute right-0 bottom-0 aspect-[13/9] h-auto w-[50vw]">
        <Image
          src="/images/brain-visualization-v3.webp"
          alt=""
          fill
          className="sc object-cover object-bottom-right"
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
