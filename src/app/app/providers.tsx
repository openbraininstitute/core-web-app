'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { SessionProvider } from 'next-auth/react';
import { Provider as JotaiProvider } from 'jotai';
import { ConfigProvider, App } from 'antd';
import { ReactNode } from 'react';

import SessionStateProvider from '@/components/SessionStateProvider';
import ThemeProvider from '@/components/ThemeProvider';
import commonAntdTheme from '@/theme/antd';

import { ProgressBarProvider } from '@/app/app/progress-provider';
import { QueryProvider } from '@/query-provider/client';
import { SessionOrNull } from '@/hooks/session';
import { AtomProvider } from '@/state/state';
import { FeatureFlags, FlagsProvider } from '@/features/feature-flags';

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
