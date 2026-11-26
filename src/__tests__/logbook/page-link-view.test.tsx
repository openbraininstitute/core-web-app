import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { PageKind } from '@/api/logbook/types';
import { PageLinkView } from '@/features/logbook/editor/blocks/page-link-view';
import { LogContext } from '@/features/logbook/log/context';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { NodeViewProps } from '@tiptap/react';
import type { IPage } from '@/api/logbook/types';

// The list asked again never answers here: what the chip shows before and after is under test.
const getResearch = vi.fn(() => new Promise(() => {}));
vi.mock('@/api/logbook/queries/research', () => ({ getResearch: () => getResearch() }));

const PROJECT = { virtualLabId: 'lab', projectId: 'proj' };
const KEY = keyBuilderLogbook.pages('log-1');
const results: IPage = {
  id: 'p-results',
  researchId: 'log-1',
  kind: PageKind.Section,
  title: 'Results, renamed',
  position: 1,
  version: 2,
  editedAt: '2026-11-23T00:00:00Z',
  editedBy: null,
};

const renderLink = (client: QueryClient, pageId: string, label: string) => {
  const props = { node: { attrs: { pageId, label } }, selected: false } as unknown as NodeViewProps;
  render(
    <QueryClientProvider client={client}>
      <LogContext.Provider value={{ project: PROJECT, logId: 'log-1' }}>
        <PageLinkView {...props} />
      </LogContext.Provider>
    </QueryClientProvider>
  );
  return screen.getByRole('button');
};

test('a link shows the page as it is named now, and a click opens that page', () => {
  const client = new QueryClient();
  client.setQueryData(KEY, [results]);
  const link = renderLink(client, 'p-results', 'Results');
  expect(link.textContent).toBe('Results, renamed');
  fireEvent.click(link);
  expect(location.pathname).toBe('/app/virtual-lab/lab/proj/logbook/log-1/page/p-results');
});

test('a page not in the list asks for it once; only a list read after that calls it deleted', async () => {
  const client = new QueryClient();
  client.setQueryData(KEY, [results], { updatedAt: Date.now() - 60_000 });
  const link = renderLink(client, 'p-new', 'Results v2');
  // Maybe a page someone made a moment ago: looked for, not called deleted.
  expect(getResearch).toHaveBeenCalledTimes(1);
  expect((link as HTMLButtonElement).disabled).toBe(true);
  expect(link.dataset['gone']).toBe('false');
  expect(link.getAttribute('title')).toContain('Looking for');
  // A fresh list still without it: now the page is gone.
  act(() => {
    client.setQueryData(KEY, [results]);
  });
  // React Query tells its readers on the next tick.
  await waitFor(() => expect(link.dataset['gone']).toBe('true'));
  expect(link.getAttribute('title')).toContain('deleted');
  expect(link.textContent).toBe('Results v2');
});
