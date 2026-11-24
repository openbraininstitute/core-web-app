'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App, ConfigProvider } from 'antd';
import { Provider as JotaiProvider } from 'jotai';
import { MotionConfig } from 'motion/react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { ProgressBarProvider } from '@/app/app/progress-provider';
import SessionStateProvider from '@/components/SessionStateProvider';
import ThemeProvider from '@/components/ThemeProvider';
import { AuthSessionProvider } from '@/features/auth/auth-session-provider';
import { type FeatureFlags, FlagsProvider } from '@/features/feature-flags';
import { QueryProvider } from '@/query-provider/client';
import { AtomProvider } from '@/state/state';
import commonAntdTheme from '@/theme/antd';
import { JotaiDevTools } from '@/utils/jotai-devtools';

import type { ReactNode } from 'react';
import type { TAuthSession } from '@/features/auth/types';

type ProvidersProps = {
  children: ReactNode;
  session: TAuthSession | null;
  flags: FeatureFlags;
};

export function Providers({ children, session, flags }: ProvidersProps) {
  return (
    <MotionConfig reducedMotion="user">
      <ConfigProvider theme={commonAntdTheme}>
        <App>
          <AntdRegistry>
            <AtomProvider>
              <NuqsAdapter>
                <QueryProvider>
                  <JotaiProvider>
                    <JotaiDevTools />
                    <ThemeProvider>
                      <AuthSessionProvider session={session}>
                        <SessionStateProvider>
                          <FlagsProvider flags={flags}>
                            <ProgressBarProvider>{children}</ProgressBarProvider>
                          </FlagsProvider>
                        </SessionStateProvider>
                      </AuthSessionProvider>
                    </ThemeProvider>
                  </JotaiProvider>
                </QueryProvider>
              </NuqsAdapter>
            </AtomProvider>
          </AntdRegistry>
        </App>
      </ConfigProvider>
    </MotionConfig>
  );
}

export default Providers;
