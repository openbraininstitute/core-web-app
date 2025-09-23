import { ReactNode, Suspense } from 'react';

import { AppOnboardingProvider } from '@/ui/segments/app-setup/discover-app';
import { Providers } from '@/app/app/providers';
import { auth } from '@/auth';

type RootLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: RootLayoutProps) {
  const session = await auth();
  return (
    <Providers session={session}>
      <AppOnboardingProvider>
        <Suspense fallback={null}>{children}</Suspense>
      </AppOnboardingProvider>
    </Providers>
  );
}
