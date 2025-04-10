import { Suspense, ReactNode } from 'react';
import WrapperBanner from '@/components/WrapperBanner';
import { basePath } from '@/config';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <WrapperBanner>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        width={176}
        height={56}
        className="absolute top-[35px] left-[35px] h-[56px] w-[176x] text-white"
        alt="OBP"
        src={`${basePath}/images/obi_logo.svg`}
      />
      <div className="text-2xl font-bold text-white">
        <Suspense fallback="Logging in...">{children}</Suspense>
      </div>
    </WrapperBanner>
  );
}
