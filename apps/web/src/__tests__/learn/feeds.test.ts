/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { wwnRecordings } from '@/features/learn/feeds';

/** One of World Wide Neuro's listing cards: the day as the listing gives it, and the abstract. */
const card = (id: string, day: string, abstract = 'An abstract.') =>
  `<article data-listing-card><h3><a href="/comp-neuro/seminars/${id}">Talk ${id}</a></h3>` +
  `<p>A Speaker · A Place</p><p>${day} · 16:00</p><p>${abstract}</p></article>`;

/** The recorded talks' pages, as World Wide Neuro would send them; any further page is empty. */
function serve(pages: string[][]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const page = Number(url.match(/[?&]page=(\d+)/)?.[1] ?? 1);
      return { ok: true, text: async () => (pages[page - 1] ?? []).join('') };
    })
  );
}

const starts = async () =>
  Object.fromEntries((await wwnRecordings()).map((talk) => [talk.id, talk.start]));

describe('wwnRecordings', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-19T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('carries the year down from page to page, anchored only by a full date', async () => {
    serve([
      [card('a', 'Mon, Oct 12'), card('b', 'Thu, Jan 8', 'Presented in the Series on 2026-01-08.')],
      // a later day than January's, further down the list: the year before
      [card('c', 'Tue, Dec 9')],
      // " on 2025-11" is not a date, so the year carried down stands
      [card('d', 'Fri, Nov 14', 'Recorded on 2025-11, in Paris.')],
    ]);
    expect(await starts()).toEqual({
      a: '2026-10-12',
      b: '2026-01-08',
      c: '2025-12-09',
      d: '2025-11-14',
    });
  });

  it('never dates a recording after today', async () => {
    serve([[card('e', 'Sat, Dec 20'), card('f', 'Mon, Oct 12')]]);
    expect(await starts()).toEqual({ e: '2025-12-20', f: '2025-10-12' });
  });
});
