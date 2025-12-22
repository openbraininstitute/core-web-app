'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App, ConfigProvider } from 'antd';
import { Provider as JotaiProvider } from 'jotai';
import { SessionProvider } from 'next-auth/react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { ReactNode } from 'react';
import { ProgressBarProvider } from '@/app/app/progress-provider';
import SessionStateProvider from '@/components/SessionStateProvider';
import ThemeProvider from '@/components/ThemeProvider';
import { type FeatureFlags, FlagsProvider } from '@/features/feature-flags';
import type { SessionOrNull } from '@/hooks/session';
import { QueryProvider } from '@/query-provider/client';
import { AtomProvider } from '@/state/state';
import commonAntdTheme from '@/theme/antd';

type ProvidersProps = {
  children: ReactNode;
  session: SessionOrNull;
  flags: FeatureFlags;
};

export function Providers({ children, session, flags }: ProvidersProps) {
  return (
    <ConfigProvider theme={commonAntdTheme}>
      <App>
        <AntdRegistry>
          <AtomProvider>
            <NuqsAdapter>
              <QueryProvider>
                <JotaiProvider>
                  <ThemeProvider>
                    <SessionProvider session={session} refetchInterval={2 * 60}>
                      <SessionStateProvider>
                        <FlagsProvider flags={flags}>
                          <ProgressBarProvider>{children}</ProgressBarProvider>
                        </FlagsProvider>
                      </SessionStateProvider>
                    </SessionProvider>
                  </ThemeProvider>
                </JotaiProvider>
              </QueryProvider>
            </NuqsAdapter>
          </AtomProvider>
        </AntdRegistry>
      </App>
    </ConfigProvider>
  );
}

export default Providers;
