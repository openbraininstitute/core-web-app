import { type ReactNode, Suspense } from 'react';

import { Providers } from '@/app/app/providers';
import { auth } from '@/auth';
import { getAllFlags } from '@/features/feature-flags';
import { LearnSettingsProvider } from '@/features/learn/learn-settings-provider';
import { getLearnSettings } from '@/features/learn/learn-settings-server';
import { AppOnboardingProvider } from '@/ui/segments/app-setup/discover-app';

type RootLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: RootLayoutProps) {
  const session = await auth();
  const flags = await getAllFlags();
  const learnSettings = await getLearnSettings();

  return (
    <Providers session={session} flags={flags}>
      <LearnSettingsProvider settings={learnSettings}>
        <AppOnboardingProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </AppOnboardingProvider>
      </LearnSettingsProvider>
    </Providers>
  );
}
