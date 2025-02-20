'use client';

import { ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import { SessionProvider } from 'next-auth/react';
import { Provider as JotaiProvider } from 'jotai';
import { DevTools } from 'jotai-devtools';

import commonAntdTheme from '@/theme/antd';
import SessionStateProvider from '@/components/SessionStateProvider';
import ThemeProvider from '@/components/ThemeProvider';
import { SessionOrNull } from '@/hooks/session';
import { AtomProvider } from '@/state/state';

type ProvidersProps = {
  children: ReactNode;
  session: SessionOrNull;
};

export default function Providers({ children, session }: ProvidersProps) {
  return (
    <ConfigProvider theme={commonAntdTheme}>
      <AtomProvider>
        <JotaiProvider>
          {process.env.NEXT_PUBLIC_JOTAI_DEVTOOLS_ENABLED && (
            <DevTools {...{ isInitialOpen: false }} />
          )}
          <ThemeProvider>
            <SessionProvider session={session} refetchInterval={2 * 60}>
              <SessionStateProvider>{children}</SessionStateProvider>
            </SessionProvider>
          </ThemeProvider>
        </JotaiProvider>
      </AtomProvider>
    </ConfigProvider>
  );
}
