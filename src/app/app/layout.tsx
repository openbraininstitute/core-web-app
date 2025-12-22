import { ReactNode, Suspense } from 'react';

import { Providers } from '@/app/app/providers';
import { auth } from '@/auth';
import { getAllFlags } from '@/features/feature-flags';
import { AppOnboardingProvider } from '@/ui/segments/app-setup/discover-app';

type RootLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: RootLayoutProps) {
  const session = await auth();
  const flags = await getAllFlags();

  return (
    <Providers session={session} flags={flags}>
      <AppOnboardingProvider>
        <Suspense fallback={null}>{children}</Suspense>
      </AppOnboardingProvider>
    </Providers>
  );
}
