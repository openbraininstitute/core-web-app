import { ReactNode, Suspense } from 'react';

import Providers from '@/app/app/providers';
import { auth } from '@/auth';

type RootLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: RootLayoutProps) {
  const session = await auth();
  return (
    <Providers session={session}>
      <Suspense fallback={null}>{children}</Suspense>
    </Providers>
  );
}
