import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { PageKind } from '@/api/logbook/types';
import { PageLinkView } from '@/features/logbook/editor/blocks/page-link-view';
import { LogContext } from '@/features/logbook/log/context';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { NodeViewProps } from '@tiptap/react';
import type { IPage } from '@/api/logbook/types';

const PROJECT = { virtualLabId: 'lab', projectId: 'proj' };
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

const renderLink = (pageId: string, label: string) => {
  const client = new QueryClient();
  client.setQueryData(keyBuilderLogbook.pages('log-1'), [results]);
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
  const link = renderLink('p-results', 'Results');
  expect(link.textContent).toBe('Results, renamed');
  fireEvent.click(link);
  expect(location.pathname).toBe('/app/virtual-lab/lab/proj/logbook/log-1/page/p-results');
});

test('a link to a deleted page keeps its old name, greyed out, and opens nothing', () => {
  const link = renderLink('p-gone', 'Old notes');
  expect(link.textContent).toBe('Old notes');
  expect((link as HTMLButtonElement).disabled).toBe(true);
  expect(link.getAttribute('title')).toContain('deleted');
});
