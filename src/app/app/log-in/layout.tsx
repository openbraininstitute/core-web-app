import { Suspense, ReactNode } from 'react';
import Image from 'next/image';

import WrapperBanner from '@/components/WrapperBanner';
import { basePath } from '@/config';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <WrapperBanner>
      <Image
        width={176}
        height={56}
        className="absolute top-[35px] left-[35px] text-white"
        alt="OBI"
        src={`${basePath}/images/obi_logo.svg`}
      />
      <div className="text-2xl font-bold text-white">
        <Suspense fallback="Logging in...">{children}</Suspense>
      </div>
    </WrapperBanner>
  );
}
