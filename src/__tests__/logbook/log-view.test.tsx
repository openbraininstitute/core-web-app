import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { PageKind } from '@/api/logbook/types';
import { Layout } from '@/features/logbook/board/layout';
import { LogView } from '@/features/logbook/log/log-view';
import { TabKind, tabKey, WARM_KEEP_MS } from '@/features/logbook/log/open-tabs';
import { ViewMode } from '@/features/logbook/log/view-mode';

import type { IPage } from '@/api/logbook/types';
import type { ILogPageProps } from '@/features/logbook/log/log-page';
import type { ILogViewProps } from '@/features/logbook/log/log-view';

const LAB = '0096a3d9-7e41-4f7a-afda-332d0504133a';
const PROJECT = '3dcb6f91-1381-4c8f-814a-554c634ed4e8';
const LOG = '57577a8b-3a80-4f16-95a8-92b0ffb3214c';

const state = vi.hoisted(() => ({
  pages: [] as unknown[],
  sockets: new Set<string>(),
  views: new Map<string, unknown>(),
  navigate: vi.fn(),
}));

vi.mock('@/features/logbook/api/pages', () => ({
  usePages: () => ({ data: state.pages, isPending: false, isError: false, error: null }),
}));
vi.mock('@/features/logbook/auth/session', () => ({ accessToken: () => 'token' }));
vi.mock('@/api/logbook/utils', () => ({ collaborationUrl: (pageId: string) => pageId }));
vi.mock('@/features/logbook/router', async (original) => ({
  ...(await original<typeof import('@/features/logbook/router')>()),
  navigate: state.navigate,
}));
vi.mock('@/features/logbook/collaboration/local-copy', () => ({
  acquireCopy: () => Promise.resolve({ document: { isDestroyed: false } }),
  releaseCopy: () => undefined,
}));
vi.mock('@hocuspocus/provider-react', async () => {
  const { useEffect } = await import('react');
  return {
    HocuspocusProviderWebsocketComponent: (props: { url: string; children: unknown }) => {
      useEffect(() => {
        state.sockets.add(props.url);
        return () => void state.sockets.delete(props.url);
      }, [props.url]);
      return props.children;
    },
    HocuspocusRoom: (props: { children: unknown }) => props.children,
  };
});
vi.mock('@/features/logbook/log/log-page', () => ({
  LogPage: (props: ILogPageProps) => {
    state.views.set(props.page.id, props);
    return (
      <div
        data-testid={`view-${props.page.id}`}
        data-shown={props.shown}
        data-keep={String(props.keepMs)}
        data-tabs={props.tabs.map(tabKey).join(' ')}
        data-file={props.artifactId ?? ''}
      />
    );
  },
}));

const page = (id: string, kind: IPage['kind'] = PageKind.Section): IPage => ({
  id,
  researchId: LOG,
  kind,
  title: id,
  position: 0,
  version: 1,
  editedAt: '2026-11-20T12:00:00Z',
  editedBy: null,
});
const main = page('main', PageKind.Main);
const a = page('a');
const b = page('b');
const c = page('c');

const props = (pageId: string | null): ILogViewProps => ({
  me: { userId: 'me', name: 'Me' } as ILogViewProps['me'],
  project: { virtualLabId: LAB, projectId: PROJECT },
  logId: LOG,
  pageId,
  log: null,
  layout: Layout.Wide,
  mode: ViewMode.Edit,
  onMode: () => undefined,
  onBack: () => undefined,
  onOpenList: () => undefined,
});
const view = (id: string): HTMLElement => screen.getByTestId(`view-${id}`);
// The class decides, not the hidden attribute: core's `[hidden]` rule loses to a display class.
const onScreen = (id: string): boolean => view(id).parentElement?.className === 'contents';
const offScreen = (id: string): boolean => view(id).parentElement?.className === 'hidden';
const data = (id: string, name: string): string | null => view(id).getAttribute(`data-${name}`);
const propsOf = (id: string): ILogPageProps => state.views.get(id) as ILogPageProps;
const base = `/app/virtual-lab/${LAB}/${PROJECT}/logbook/${LOG}`;

beforeEach(() => {
  state.pages = [main, a, b, c];
  state.sockets.clear();
  state.views.clear();
  state.navigate.mockClear();
});

test('the page left stays mounted with its socket, hidden; the one shown is on screen', async () => {
  const shown = render(<LogView {...props(null)} />);
  await screen.findByTestId('view-main');
  expect(onScreen('main')).toBe(true);
  expect(data('main', 'keep')).toBe('null');

  shown.rerender(<LogView {...props('a')} />);
  await screen.findByTestId('view-a');
  expect(onScreen('a')).toBe(true);
  expect(offScreen('main')).toBe(true);
  expect(data('main', 'keep')).toBe(String(WARM_KEEP_MS));
  expect(data('a', 'tabs')).toBe('page:a');
  expect([...state.sockets].toSorted()).toEqual(['a', 'main']);
});

test('a tab click shows its page at once and moves the address; cooling frees the page left', async () => {
  const shown = render(<LogView {...props('a')} />);
  await screen.findByTestId('view-a');
  act(() => propsOf('a').onSelectTab({ kind: TabKind.Page, id: 'main' }));
  await screen.findByTestId('view-main');
  expect(onScreen('main')).toBe(true);
  expect(offScreen('a')).toBe(true);
  expect(state.navigate).toHaveBeenLastCalledWith(base);

  shown.rerender(<LogView {...props(null)} />);
  expect(onScreen('main')).toBe(true);
  expect(data('a', 'keep')).toBe(String(WARM_KEEP_MS));

  act(() => propsOf('a').onCool('a'));
  expect(screen.queryByTestId('view-a')).toBeNull();
  await waitFor(() => expect([...state.sockets]).toEqual(['main']));
  expect(data('main', 'tabs')).toBe('page:a');
});

test('the page on screen cannot be cooled; a closed tab and a page past the warm limit go at once', async () => {
  const shown = render(<LogView {...props('a')} />);
  await screen.findByTestId('view-a');
  act(() => propsOf('a').onCool('a'));
  expect(onScreen('a')).toBe(true);

  for (const next of ['b', 'c', null]) {
    shown.rerender(<LogView {...props(next)} />);
    await screen.findByTestId(`view-${next ?? 'main'}`);
  }
  expect(data('c', 'keep')).toBe(String(WARM_KEEP_MS));
  expect(data('b', 'keep')).toBe(String(WARM_KEEP_MS));
  expect(data('a', 'keep')).toBe('0');

  act(() => propsOf('main').onCloseTab({ kind: TabKind.Page, id: 'c' }));
  expect(data('c', 'keep')).toBe('0');
  expect(data('main', 'tabs')).toBe('page:a page:b');
  expect(state.navigate).not.toHaveBeenCalled();
});

test('a file opens over the page on screen and stays when its page tab closes', async () => {
  render(<LogView {...props('a')} />);
  await screen.findByTestId('view-a');
  act(() => propsOf('a').onOpenArtifact('fig.png'));
  expect(data('a', 'file')).toBe('fig.png');
  expect(data('a', 'tabs')).toBe('page:a artifact:fig.png');
  expect(state.navigate).not.toHaveBeenCalled();

  act(() => propsOf('a').onCloseTab({ kind: TabKind.Page, id: 'a' }));
  await screen.findByTestId('view-main');
  expect(onScreen('main')).toBe(true);
  expect(data('main', 'file')).toBe('fig.png');
  expect(state.navigate).toHaveBeenLastCalledWith(base);
});

test('a page deleted while warm loses its view and tab; deleted on screen, it stays read-only', async () => {
  const shown = render(<LogView {...props('a')} />);
  await screen.findByTestId('view-a');
  shown.rerender(<LogView {...props('b')} />);
  await screen.findByTestId('view-b');

  state.pages = [main, c];
  shown.rerender(<LogView {...props('b')} />);
  expect(screen.queryByTestId('view-a')).toBeNull();
  expect(onScreen('b')).toBe(true);
  expect(propsOf('b').deleted).toBe(true);
  expect(data('b', 'tabs')).toBe('page:b');
});
