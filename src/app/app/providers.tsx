'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { SessionProvider } from 'next-auth/react';
import { Provider as JotaiProvider } from 'jotai';
import { ConfigProvider, App } from 'antd';
import { DevTools } from 'jotai-devtools';
import { ReactNode } from 'react';

import SessionStateProvider from '@/components/SessionStateProvider';
import ThemeProvider from '@/components/ThemeProvider';
import commonAntdTheme from '@/theme/antd';

import { ProgressBarProvider } from '@/app/app/progress-provider';
import { QueryProvider } from '@/query-provider/client';
import { SessionOrNull } from '@/hooks/session';
import { AtomProvider } from '@/state/state';

import 'jotai-devtools/styles.css';

type ProvidersProps = {
  children: ReactNode;
  session: SessionOrNull;
};

export function Providers({ children, session }: ProvidersProps) {
  return (
    <ConfigProvider theme={commonAntdTheme}>
      <App>
        <AntdRegistry>
          <AtomProvider>
            <NuqsAdapter>
              <QueryProvider>
                <JotaiProvider>
                  {process.env.NEXT_PUBLIC_JOTAI_DEVTOOLS_ENABLED && (
                    <DevTools {...{ isInitialOpen: false, position: 'bottom-right' }} />
                  )}
                  <ThemeProvider>
                    <SessionProvider session={session} refetchInterval={2 * 60}>
                      <SessionStateProvider>
                        <ProgressBarProvider>{children}</ProgressBarProvider>
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
