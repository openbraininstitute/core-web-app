import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, render } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { Provider as JotaiProvider } from 'jotai';
import { SessionProvider } from 'next-auth/react';

import commonAntdTheme from '@/theme/antd';

import type { Session } from 'next-auth';
import type { ReactElement, ReactNode } from 'react';

type Options = RenderOptions & {
  session?: Session | null;
  queryClient?: QueryClient;
  withAntd?: boolean;
  withJotai?: boolean;
  withSession?: boolean;
  withQuery?: boolean;
};

const makeTestQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

export function renderWithProviders(ui: ReactElement, opts: Options = {}) {
  const {
    session = null,
    queryClient = makeTestQueryClient(),
    withAntd = true,
    withJotai = true,
    withSession = false,
    withQuery = true,
    ...rtl
  } = opts;

  const Wrapper = ({ children }: { children: ReactNode }) => {
    let tree: ReactNode = children;
    if (withSession) tree = <SessionProvider session={session}>{tree}</SessionProvider>;
    if (withQuery) tree = <QueryClientProvider client={queryClient}>{tree}</QueryClientProvider>;
    if (withJotai) tree = <JotaiProvider>{tree}</JotaiProvider>;
    if (withAntd) tree = <ConfigProvider theme={commonAntdTheme}>{tree}</ConfigProvider>;
    return tree;
  };

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...rtl }) };
}
