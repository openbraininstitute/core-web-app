'use client';

import { ReactNode } from 'react';
import { ConfigProvider, App } from 'antd';
import { SessionProvider } from 'next-auth/react';
import { Provider as JotaiProvider } from 'jotai';
import { DevTools } from 'jotai-devtools';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { AntdRegistry } from '@ant-design/nextjs-registry';

import commonAntdTheme from '@/theme/antd';
import SessionStateProvider from '@/components/SessionStateProvider';
import ThemeProvider from '@/components/ThemeProvider';
import { SessionOrNull } from '@/hooks/session';
import { AtomProvider } from '@/state/state';

import 'jotai-devtools/styles.css';

type ProvidersProps = {
  children: ReactNode;
  session: SessionOrNull;
};

export default function Providers({ children, session }: ProvidersProps) {
  return (
    <ConfigProvider theme={commonAntdTheme}>
      <App>
        <AntdRegistry>
          <AtomProvider>
            <NuqsAdapter>
              <JotaiProvider>
                {process.env.NEXT_PUBLIC_JOTAI_DEVTOOLS_ENABLED && (
                  <DevTools {...{ isInitialOpen: false, position: 'bottom-right' }} />
                )}
                <ThemeProvider>
                  <SessionProvider session={session} refetchInterval={2 * 60}>
                    <SessionStateProvider>{children}</SessionStateProvider>
                  </SessionProvider>
                </ThemeProvider>
              </JotaiProvider>
            </NuqsAdapter>
          </AtomProvider>
        </AntdRegistry>
      </App>
    </ConfigProvider>
  );
}
