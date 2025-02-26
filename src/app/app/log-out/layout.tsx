import { Suspense, ReactNode } from 'react';

import WrapperBanner from '@/components/WrapperBanner';
import Logo from '@/components/logo/as-svg';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <WrapperBanner>
      <Logo className="absolute left-10 top-10 text-white" />
      <div className="text-2xl font-bold text-white">
        <Suspense fallback="Logging out...">{children}</Suspense>
      </div>
    </WrapperBanner>
  );
}
