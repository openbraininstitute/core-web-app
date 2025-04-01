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
        className="absolute left-[35px] top-[35px] h-[56px] w-[176x] text-white"
        alt="OBP"
        src={`${basePath}/images/obi_logo.svg`}
      />
      <div className="text-2xl font-bold text-white">
        <Suspense fallback="Logging in...">{children}</Suspense>
      </div>
    </WrapperBanner>
  );
}
