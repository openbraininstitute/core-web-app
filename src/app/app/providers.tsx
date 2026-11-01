'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App, ConfigProvider } from 'antd';
import { Provider as JotaiProvider } from 'jotai';
import { MotionConfig } from 'motion/react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { ProgressBarProvider } from '@/app/app/progress-provider';
import ThemeProvider from '@/components/ThemeProvider';
import SessionStateProvider from '@/features/auth/components/session-state-provider';
import { type FeatureFlags, FlagsProvider } from '@/features/feature-flags';
import { QueryProvider } from '@/query-provider/client';
import { AtomProvider } from '@/state/state';
import commonAntdTheme from '@/theme/antd';
import { JotaiDevTools } from '@/utils/jotai-devtools';

import type { ReactNode } from 'react';

type ProvidersProps = {
  children: ReactNode;
  flags: FeatureFlags;
};

export function Providers({ children, flags }: ProvidersProps) {
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
                      {/* Better Auth needs no SessionProvider; `useAuthSession` is
                          store-based. SessionStateProvider drives the session
                          atom and the periodic refetch (see useSessionState). */}
                      <SessionStateProvider>
                        <FlagsProvider flags={flags}>
                          <ProgressBarProvider>{children}</ProgressBarProvider>
                        </FlagsProvider>
                      </SessionStateProvider>
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
