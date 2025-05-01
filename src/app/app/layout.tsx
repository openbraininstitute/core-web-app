import { ReactNode, Suspense } from 'react';
import dynamic from 'next/dynamic';

import Providers from '@/app/app/providers';
import { auth } from '@/auth';

const TermsOfUseAcceptance = dynamic(
  () => import('@/components/terms-of-use-acceptance/terms-of-use-acceptance'),
  { ssr: false }
);

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
