import { ReactNode, Suspense } from 'react';

import Providers from './providers';
import { auth } from '@/auth';
import TermsOfUseAcceptance from '@/components/terms-of-use-acceptance';

type RootLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: RootLayoutProps) {
  const session = await auth();
  return (
    <Providers session={session}>
      <Suspense fallback={null}>
        {children}
        <TermsOfUseAcceptance />
      </Suspense>
    </Providers>
  );
}
